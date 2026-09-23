import fs from "node:fs";
import path from "node:path";

type TeslaSourceRow = {
  chargingStartTime: string;
  chargingDurationMinutes: number;
  energyDeliveredKwh: number;
};

type TeslaHistoryRow = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  energyKwh: number;
  averageKw: number;
  onPeakOverlapMinutes: number;
  estimatedOnPeakKwh: number;
  source: string;
};

const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "data/history/tesla/charging.csv"
);

// ---------------------------------------------------------
// CSV PARSING
// ---------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

function parseTeslaCsv(filePath: string): TeslaSourceRow[] {
  const raw = fs.readFileSync(filePath, "utf8").trim();

  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  const startIndex = headers.indexOf("Charging Start Time");
  const durationIndex = headers.indexOf("Charging Duration (minutes)");
  const energyIndex = headers.indexOf("Energy Delivered (kWh)");

  if (
    startIndex === -1 ||
    durationIndex === -1 ||
    energyIndex === -1
  ) {
    throw new Error(
      "Tesla CSV does not contain the expected charging-history columns."
    );
  }

  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const values = parseCsvLine(line);

      const chargingStartTime = values[startIndex];
      const chargingDurationMinutes = Number(values[durationIndex]);
      const energyDeliveredKwh = Number(values[energyIndex]);

      if (
        !chargingStartTime ||
        !Number.isFinite(chargingDurationMinutes) ||
        !Number.isFinite(energyDeliveredKwh)
      ) {
        throw new Error(
          `Invalid Tesla charging record on CSV row ${index + 2}.`
        );
      }

      return {
        chargingStartTime,
        chargingDurationMinutes,
        energyDeliveredKwh,
      };
    });
}

// ---------------------------------------------------------
// APS ON-PEAK CALCULATION
//
// APS weekday demand window:
// Monday-Friday, 4:00 PM-7:00 PM.
//
// We calculate overlap minute-by-minute because Tesla
// sessions can begin/end in the middle of the window.
// ---------------------------------------------------------

function isAPSOnPeak(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  const weekday = day >= 1 && day <= 5;

  return weekday && hour >= 16 && hour < 19;
}

function calculateOnPeakOverlapMinutes(
  start: Date,
  durationMinutes: number
): number {
  let overlap = 0;

  for (let minute = 0; minute < durationMinutes; minute += 1) {
    const sample = new Date(
      start.getTime() + minute * 60_000
    );

    if (isAPSOnPeak(sample)) {
      overlap += 1;
    }
  }

  return overlap;
}

// ---------------------------------------------------------
// NORMALIZATION
// ---------------------------------------------------------

function normalizeRow(
  row: TeslaSourceRow,
  sourceFile: string
): TeslaHistoryRow {
  const start = new Date(row.chargingStartTime);

  if (Number.isNaN(start.getTime())) {
    throw new Error(
      `Invalid Tesla timestamp: ${row.chargingStartTime}`
    );
  }

  const end = new Date(
    start.getTime() +
      row.chargingDurationMinutes * 60_000
  );

  const averageKw =
    row.chargingDurationMinutes > 0
      ? row.energyDeliveredKwh /
        (row.chargingDurationMinutes / 60)
      : 0;

  const onPeakOverlapMinutes =
    calculateOnPeakOverlapMinutes(
      start,
      row.chargingDurationMinutes
    );

  /*
   * Tesla gives us total session energy, not minute-by-minute
   * power. Therefore on-peak energy is an ESTIMATE based on
   * average charging power across the session.
   */

  const estimatedOnPeakKwh =
    averageKw * (onPeakOverlapMinutes / 60);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMinutes: row.chargingDurationMinutes,
    energyKwh: row.energyDeliveredKwh,
    averageKw,
    onPeakOverlapMinutes,
    estimatedOnPeakKwh,
    source: sourceFile,
  };
}

// ---------------------------------------------------------
// HISTORY CSV
// ---------------------------------------------------------

const HISTORY_HEADERS = [
  "startTime",
  "endTime",
  "durationMinutes",
  "energyKwh",
  "averageKw",
  "onPeakOverlapMinutes",
  "estimatedOnPeakKwh",
  "source",
];

function escapeCsv(value: string | number): string {
  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function historyRowToCsv(row: TeslaHistoryRow): string {
  return [
    row.startTime,
    row.endTime,
    row.durationMinutes,
    row.energyKwh.toFixed(3),
    row.averageKw.toFixed(3),
    row.onPeakOverlapMinutes,
    row.estimatedOnPeakKwh.toFixed(3),
    row.source,
  ]
    .map(escapeCsv)
    .join(",");
}

function readExistingHistory(): TeslaHistoryRow[] {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return [];
  }

  const raw = fs.readFileSync(OUTPUT_FILE, "utf8").trim();

  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return {
      startTime: values[0],
      endTime: values[1],
      durationMinutes: Number(values[2]),
      energyKwh: Number(values[3]),
      averageKw: Number(values[4]),
      onPeakOverlapMinutes: Number(values[5]),
      estimatedOnPeakKwh: Number(values[6]),
      source: values[7],
    };
  });
}

// ---------------------------------------------------------
// DEDUPLICATION
// ---------------------------------------------------------

function sessionKey(row: TeslaHistoryRow): string {
  return [
    row.startTime,
    row.durationMinutes,
    row.energyKwh.toFixed(3),
  ].join("|");
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------

function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.error(
      "Usage: npx tsx scripts/tesla-import.ts <tesla-csv>"
    );

    process.exit(1);
  }

  const inputFile = path.resolve(
    process.cwd(),
    inputArg
  );

  if (!fs.existsSync(inputFile)) {
    console.error(`Tesla CSV not found: ${inputFile}`);

    process.exit(1);
  }

  const sourceFile = path.basename(inputFile);

  console.log("");
  console.log("========================================");
  console.log("       TESLA CHARGING IMPORT");
  console.log("========================================");
  console.log("");
  console.log(`Source: ${sourceFile}`);

  const sourceRows = parseTeslaCsv(inputFile);

  console.log(
    `Tesla sessions found: ${sourceRows.length}`
  );

  const normalized = sourceRows.map((row) =>
    normalizeRow(row, sourceFile)
  );

  const existing = readExistingHistory();

  const sessions = new Map<string, TeslaHistoryRow>();

  for (const row of existing) {
    sessions.set(sessionKey(row), row);
  }

  const existingCount = sessions.size;

  for (const row of normalized) {
    sessions.set(sessionKey(row), row);
  }

  const allSessions = Array.from(
    sessions.values()
  ).sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  const addedCount =
    allSessions.length - existingCount;

  fs.mkdirSync(
    path.dirname(OUTPUT_FILE),
    { recursive: true }
  );

  const output = [
    HISTORY_HEADERS.join(","),
    ...allSessions.map(historyRowToCsv),
  ].join("\n");

  fs.writeFileSync(
    OUTPUT_FILE,
    `${output}\n`,
    "utf8"
  );

  // -------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------

  const totalEnergy = allSessions.reduce(
    (sum, row) => sum + row.energyKwh,
    0
  );

  const sessionsWithOnPeakOverlap =
    allSessions.filter(
      (row) => row.onPeakOverlapMinutes > 0
    );

  const totalOnPeakMinutes =
    sessionsWithOnPeakOverlap.reduce(
      (sum, row) =>
        sum + row.onPeakOverlapMinutes,
      0
    );

  const estimatedOnPeakEnergy =
    sessionsWithOnPeakOverlap.reduce(
      (sum, row) =>
        sum + row.estimatedOnPeakKwh,
      0
    );

  console.log("");
  console.log("----------------------------------------");
  console.log("IMPORT RESULT");
  console.log("----------------------------------------");

  console.log(
    `Existing sessions : ${existingCount}`
  );

  console.log(
    `New sessions      : ${addedCount}`
  );

  console.log(
    `Total sessions    : ${allSessions.length}`
  );

  console.log(
    `Total energy      : ${totalEnergy.toFixed(2)} kWh`
  );

  console.log("");
  console.log("----------------------------------------");
  console.log("APS ON-PEAK ANALYSIS");
  console.log("----------------------------------------");

  console.log(
    `Sessions overlapping 4-7 PM : ${sessionsWithOnPeakOverlap.length}`
  );

  console.log(
    `On-peak overlap minutes     : ${totalOnPeakMinutes}`
  );

  console.log(
    `Estimated on-peak energy    : ${estimatedOnPeakEnergy.toFixed(
      2
    )} kWh`
  );

  console.log("");
  console.log(`History: ${OUTPUT_FILE}`);
  console.log("");
}

main();