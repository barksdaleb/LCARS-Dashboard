import fs from "fs";
import path from "path";
import readline from "readline";
import { google } from "googleapis";

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "data/private/google-calendar-credentials.json"
);

const TOKEN_PATH = path.join(
  process.cwd(),
  "data/private/google-calendar-token.json"
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data/ops/calendar.json"
);

const HOME_OPS_CALENDAR_NAME =
  "Home Ops Calendar";

type HomeOpsEvent = {
  id: string | null;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
};

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Google credentials not found: ${CREDENTIALS_PATH}`
    );
  }

  const credentials = JSON.parse(
    fs.readFileSync(CREDENTIALS_PATH, "utf8")
  );

  const installed = credentials.installed;

  if (!installed) {
    throw new Error(
      "Expected Google Desktop OAuth credentials."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    installed.redirect_uris?.[0]
  );

  // ----------------------------------------
  // Google authorization
  // ----------------------------------------

  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(
      fs.readFileSync(TOKEN_PATH, "utf8")
    );

    oauth2Client.setCredentials(tokens);
  } else {
    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        ],
        prompt: "consent",
      });

    console.log("");
    console.log(
      "Google authorization is required."
    );
    console.log("");
    console.log(authUrl);
    console.log("");

    const code = await ask(
      "Paste the Google authorization code here: "
    );

    if (!code) {
      throw new Error(
        "No authorization code provided."
      );
    }

    const { tokens } =
      await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    fs.writeFileSync(
      TOKEN_PATH,
      JSON.stringify(tokens, null, 2)
    );
  }

  // ----------------------------------------
  // Connect to Google Calendar
  // ----------------------------------------

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  const calendarList =
    await calendar.calendarList.list();

  const homeOpsCalendar =
    calendarList.data.items?.find(
      (entry) =>
        entry.summary?.trim().toLowerCase() ===
        HOME_OPS_CALENDAR_NAME.toLowerCase()
    );

  if (!homeOpsCalendar?.id) {
    throw new Error(
      `"${HOME_OPS_CALENDAR_NAME}" calendar was not found.`
    );
  }

  // ----------------------------------------
  // Retrieve upcoming events
  // ----------------------------------------

  const eventsResponse =
    await calendar.events.list({
      calendarId: homeOpsCalendar.id,
      timeMin: new Date().toISOString(),
      maxResults: 25,
      singleEvents: true,
      orderBy: "startTime",
    });

  const googleEvents =
    eventsResponse.data.items ?? [];

  const events: HomeOpsEvent[] =
    googleEvents.map((event) => {
      const allDay = Boolean(
        event.start?.date
      );

      return {
        id: event.id ?? null,
        title:
          event.summary ?? "Untitled Event",

        start:
          event.start?.dateTime ??
          event.start?.date ??
          null,

        end:
          event.end?.dateTime ??
          event.end?.date ??
          null,

        allDay,

        location:
          event.location ?? null,

        description:
          event.description ?? null,
      };
    });

  // ----------------------------------------
  // Write Home Ops snapshot
  // ----------------------------------------

  fs.mkdirSync(
    path.dirname(OUTPUT_PATH),
    {
      recursive: true,
    }
  );

  const snapshot = {
    generatedAt:
      new Date().toISOString(),

    calendar:
      HOME_OPS_CALENDAR_NAME,

    eventCount:
      events.length,

    events,
  };

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(snapshot, null, 2) + "\n"
  );

  console.log(
    `Calendar: ${HOME_OPS_CALENDAR_NAME}`
  );

  console.log(
    `Upcoming events: ${events.length}`
  );

  for (const event of events.slice(0, 5)) {
    console.log(
      `  • ${event.title} — ${event.start}`
    );
  }

  console.log(
    `Calendar snapshot written: ${OUTPUT_PATH}`
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "❌ Home Ops Calendar update failed"
  );
  console.error(error);
  process.exit(1);
});