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

const HOME_OPS_CALENDAR_NAME = "Home Ops Calendar";

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

function formatEventTime(
  dateTime?: string | null,
  date?: string | null
): string {
  if (dateTime) {
    return new Date(dateTime).toLocaleString(
      "en-US",
      {
        timeZone: "America/Phoenix",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  if (date) {
    const [year, month, day] =
      date.split("-").map(Number);

    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "America/Phoenix",
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    ).format(
      new Date(
        Date.UTC(year, month - 1, day, 12)
      )
    );
  }

  return "Unknown time";
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log("       HOME OPS GOOGLE CALENDAR");
  console.log("========================================");
  console.log("");

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
  // Load existing authorization
  // ----------------------------------------

  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(
      fs.readFileSync(TOKEN_PATH, "utf8")
    );

    oauth2Client.setCredentials(tokens);

    console.log(
      "✓ Existing Google authorization loaded."
    );
  } else {
    // ----------------------------------------
    // First-time authorization
    // ----------------------------------------

    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        ],
        prompt: "consent",
      });

    console.log(
      "Google authorization is required."
    );

    console.log("");
    console.log(
      "Open this URL in your browser:"
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

    console.log("");
    console.log(
      "✓ Google authorization saved."
    );
  }

  // ----------------------------------------
  // Connect to Google Calendar
  // ----------------------------------------

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  console.log("");
  console.log(
    `Looking for "${HOME_OPS_CALENDAR_NAME}" calendar...`
  );

  const calendarList =
    await calendar.calendarList.list();

  const homeOpsCalendar =
    calendarList.data.items?.find(
      (entry) =>
        entry.summary ===
        HOME_OPS_CALENDAR_NAME
    );

  if (!homeOpsCalendar?.id) {
    throw new Error(
      `"${HOME_OPS_CALENDAR_NAME}" calendar was not found.`
    );
  }

  console.log(
    `✓ Found ${HOME_OPS_CALENDAR_NAME}`
  );

  // ----------------------------------------
  // Retrieve upcoming events
  // ----------------------------------------

  const eventsResponse =
    await calendar.events.list({
      calendarId: homeOpsCalendar.id,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

  const events =
    eventsResponse.data.items ?? [];

  console.log("");
  console.log("UPCOMING HOME OPS EVENTS");
  console.log("----------------------------------------");

  if (!events.length) {
    console.log("No upcoming events.");
  } else {
    for (const event of events) {
      const when = formatEventTime(
        event.start?.dateTime,
        event.start?.date
      );

      console.log("");
      console.log(
        `• ${event.summary ?? "Untitled Event"}`
      );

      console.log(`  ${when}`);

      if (event.location) {
        console.log(
          `  Location: ${event.location}`
        );
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log(
    `✅ ${events.length} HOME OPS EVENT(S) FOUND`
  );
  console.log("========================================");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error(
    "❌ Google Calendar test failed"
  );
  console.error(error);
  process.exit(1);
});