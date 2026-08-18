import fs from "fs";
import path from "path";

type FreshnessStatus =
  | "LIVE"
  | "CURRENT"
  | "STALE"
  | "MISSING";

type SourceFreshness = {
  source: string;
  latest: Date | null;
  status: FreshnessStatus;
};

const ROOT = process.cwd();

function latestCsvTimestamp(
  filePath: string,
  localPhoenix = false
): Date | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split("\n");

  for (let i = lines.length - 1; i >= 0; i--) {
    const firstColumn = lines[i]
      .split(",")[0]
      ?.trim();

    if (!firstColumn) {
      continue;
    }

    const timestamp = localPhoenix
      ? `${firstColumn}:00-07:00`
      : firstColumn;

    const parsed = new Date(timestamp);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function ageHours(date: Date): number {
  return (
    Date.now() - date.getTime()
  ) / 3_600_000;
}

function ecobeeStatus(
  latest: Date | null
): FreshnessStatus {
  if (!latest) {
    return "MISSING";
  }

  return ageHours(latest) <= 36
    ? "CURRENT"
    : "STALE";
}

function apsStatus(
  latest: Date | null
): FreshnessStatus {
  if (!latest) {
    return "MISSING";
  }

  // APS hourly history normally trails real time
  // because the newest complete day is usually yesterday.
  return ageHours(latest) <= 48
    ? "CURRENT"
    : "STALE";
}

function phoenixTime(
  date: Date | null
): string {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Phoenix",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export function getDataFreshness():
  SourceFreshness[] {

  const apsLatest =
    latestCsvTimestamp(
      path.join(
        ROOT,
        "data/history/aps/hourly.csv"
      ),
      true
    );

  const frontLatest =
    latestCsvTimestamp(
      path.join(
        ROOT,
        "data/history/ecobee/front-ac.csv"
      )
    );

  const hallLatest =
    latestCsvTimestamp(
      path.join(
        ROOT,
        "data/history/ecobee/hall-ac.csv"
      )
    );

  return [
    {
      source: "Weather",
      latest: new Date(),
      status: "LIVE",
    },
    {
      source: "APS",
      latest: apsLatest,
      status: apsStatus(apsLatest),
    },
    {
      source: "Front AC",
      latest: frontLatest,
      status: ecobeeStatus(frontLatest),
    },
    {
      source: "Hall AC",
      latest: hallLatest,
      status: ecobeeStatus(hallLatest),
    },
  ];
}

export function printDataFreshness() {
  const sources = getDataFreshness();

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       HOME OPS DATA FRESHNESS"
  );
  console.log(
    "========================================"
  );

  for (const item of sources) {
    const latest =
      item.status === "LIVE"
        ? "Live"
        : phoenixTime(item.latest);

    console.log(
      `${item.source.padEnd(12)} ${latest.padEnd(
        20
      )} ${item.status}`
    );
  }

  console.log(
    "========================================"
  );
}

if (require.main === module) {
  printDataFreshness();
}