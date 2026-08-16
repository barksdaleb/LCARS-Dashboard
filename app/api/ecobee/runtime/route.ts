import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type RuntimeWindow = {
  totalHours: number;
  precoolHours: number;
  peakHours: number;
  lastReading: string | null;
};

type PhoenixParts = {
  date: string;
  hour: number;
  minute: number;
};

function getPhoenixParts(timestampText: string): PhoenixParts | null {
  const timestamp = new Date(timestampText);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(timestamp);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hourText = parts.find((p) => p.type === "hour")?.value;
  const minuteText = parts.find((p) => p.type === "minute")?.value;

  if (
    !year ||
    !month ||
    !day ||
    hourText === undefined ||
    minuteText === undefined
  ) {
    return null;
  }

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";

  const hour12 = hour % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function analyze(file: string, targetDate: string): RuntimeWindow {
  const csv = fs.readFileSync(file, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);

  lines.shift();

  let totalSeconds = 0;
  let precoolSeconds = 0;
  let peakSeconds = 0;

  let latestTimestamp = 0;
  let lastReading: string | null = null;

  for (const line of lines) {
    const values = line.split(",");

    const timestampText = values[0];
    const seconds = Number(values[6]);

    if (!timestampText || !Number.isFinite(seconds)) {
      continue;
    }

    const timestamp = new Date(timestampText);
    const phoenix = getPhoenixParts(timestampText);

    if (!phoenix || phoenix.date !== targetDate) {
      continue;
    }

    totalSeconds += seconds;

    if (phoenix.hour >= 14 && phoenix.hour < 16) {
      precoolSeconds += seconds;
    }

    if (phoenix.hour >= 16 && phoenix.hour < 19) {
      peakSeconds += seconds;
    }

    if (timestamp.getTime() > latestTimestamp) {
      latestTimestamp = timestamp.getTime();

      lastReading = formatTime(
        phoenix.hour,
        phoenix.minute
      );
    }
  }

  return {
    totalHours: totalSeconds / 3600,
    precoolHours: precoolSeconds / 3600,
    peakHours: peakSeconds / 3600,
    lastReading,
  };
}

function getDates(file: string): Set<string> {
  const csv = fs.readFileSync(file, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);

  lines.shift();

  const dates = new Set<string>();

  for (const line of lines) {
    const values = line.split(",");
    const timestampText = values[0];

    if (!timestampText) {
      continue;
    }

    const phoenix = getPhoenixParts(timestampText);

    if (phoenix) {
      dates.add(phoenix.date);
    }
  }

  return dates;
}

export async function GET() {
  const history = path.join(
    process.cwd(),
    "data/history/ecobee"
  );

  const hallFile = path.join(history, "hall-ac.csv");
  const frontFile = path.join(history, "front-ac.csv");

  const hallDates = getDates(hallFile);
  const frontDates = getDates(frontFile);

  const commonDates = [...hallDates]
    .filter((date) => frontDates.has(date))
    .sort();

  if (commonDates.length === 0) {
    return NextResponse.json(
      { error: "No common Ecobee history dates found." },
      { status: 404 }
    );
  }

  const dataDate = commonDates[commonDates.length - 1];

  const hall = analyze(hallFile, dataDate);
  const front = analyze(frontFile, dataDate);

  return NextResponse.json({
    dataDate,
    hall,
    front,
  });
}