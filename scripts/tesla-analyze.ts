import fs from "node:fs";
import path from "node:path";

import energy from "../data/energy.json";

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

const HISTORY_FILE = path.resolve(
  process.cwd(),
  "data/history/tesla/charging.csv"
);

// ---------------------------------------------------------
// APS BILLING CYCLE
//
// Read directly from the APS energy data so Tesla analysis
// automatically follows the current APS billing cycle.
// ---------------------------------------------------------

const CYCLE_START = energy.energy.currentCycleStart;

// ---------------------------------------------------------
// CSV
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

function readHistory(): TeslaHistoryRow[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    throw new Error(
      `Tesla history not found: ${HISTORY_FILE}`
    );
  }

  const raw = fs.readFileSync(
    HISTORY_FILE,
    "utf8"
  ).trim();

  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/);

  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
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
// HELPERS
// ---------------------------------------------------------

function localDateFromTimestamp(
  timestamp: string
): string {
  return timestamp.slice(0, 10);
}

function formatTimestamp(
  timestamp: string
): string {
  const date = new Date(timestamp);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(
  minutes: number
): string {
  const roundedMinutes = Math.round(minutes);

  const hours = Math.floor(
    roundedMinutes / 60
  );

  const remainingMinutes =
    roundedMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------

function main() {
  const sessions = readHistory();

  if (sessions.length === 0) {
    console.log(
      "No Tesla charging sessions found."
    );

    return;
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  const latest = sorted[sorted.length - 1];

  // -------------------------------------------------------
  // ALL HISTORY
  // -------------------------------------------------------

  const totalEnergy = sessions.reduce(
    (sum, session) =>
      sum + session.energyKwh,
    0
  );

  const totalMinutes = sessions.reduce(
    (sum, session) =>
      sum + session.durationMinutes,
    0
  );

  // -------------------------------------------------------
  // APS ON-PEAK PERFORMANCE
  // -------------------------------------------------------

  const onPeakSessions =
    sessions.filter(
      (session) =>
        session.onPeakOverlapMinutes > 0
    );

  const offPeakSessions =
    sessions.filter(
      (session) =>
        session.onPeakOverlapMinutes === 0
    );

  const totalOnPeakMinutes =
    onPeakSessions.reduce(
      (sum, session) =>
        sum +
        session.onPeakOverlapMinutes,
      0
    );

  const estimatedOnPeakEnergy =
    onPeakSessions.reduce(
      (sum, session) =>
        sum +
        session.estimatedOnPeakKwh,
      0
    );

  // -------------------------------------------------------
  // CURRENT APS BILLING CYCLE
  // -------------------------------------------------------

  const cycleSessions =
    sessions.filter(
      (session) =>
        localDateFromTimestamp(
          session.startTime
        ) >= CYCLE_START
    );

  const cycleEnergy =
    cycleSessions.reduce(
      (sum, session) =>
        sum + session.energyKwh,
      0
    );

  const cycleMinutes =
    cycleSessions.reduce(
      (sum, session) =>
        sum + session.durationMinutes,
      0
    );

  const cycleOnPeakSessions =
    cycleSessions.filter(
      (session) =>
        session.onPeakOverlapMinutes > 0
    );

  const cycleOffPeakSessions =
    cycleSessions.filter(
      (session) =>
        session.onPeakOverlapMinutes === 0
    );

  const cycleOnPeakMinutes =
    cycleOnPeakSessions.reduce(
      (sum, session) =>
        sum +
        session.onPeakOverlapMinutes,
      0
    );

  const cycleEstimatedOnPeakEnergy =
    cycleOnPeakSessions.reduce(
      (sum, session) =>
        sum +
        session.estimatedOnPeakKwh,
      0
    );

  // -------------------------------------------------------
  // OUTPUT
  // -------------------------------------------------------

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       TESLA CHARGING ANALYSIS"
  );
  console.log(
    "========================================"
  );

  // -------------------------------------------------------
  // ALL IMPORTED HISTORY
  // -------------------------------------------------------

  console.log("");
  console.log(
    "ALL IMPORTED HISTORY"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Sessions             : ${sessions.length}`
  );

  console.log(
    `Total energy         : ${totalEnergy.toFixed(
      2
    )} kWh`
  );

  console.log(
    `Total charging time  : ${formatDuration(
      totalMinutes
    )}`
  );

  // -------------------------------------------------------
  // APS PERFORMANCE
  // -------------------------------------------------------

  console.log("");
  console.log(
    "APS 4-7 PM PERFORMANCE"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Off-peak sessions    : ${offPeakSessions.length}`
  );

  console.log(
    `On-peak overlaps     : ${onPeakSessions.length}`
  );

  console.log(
    `Overlap minutes      : ${totalOnPeakMinutes}`
  );

  console.log(
    `Est. on-peak energy  : ${estimatedOnPeakEnergy.toFixed(
      2
    )} kWh`
  );

  // -------------------------------------------------------
  // CURRENT BILLING CYCLE
  // -------------------------------------------------------

  console.log("");
  console.log(
    "CURRENT BILLING CYCLE"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Cycle start           : ${CYCLE_START}`
  );

  console.log(
    `Charging sessions     : ${cycleSessions.length}`
  );

  console.log(
    `Off-peak sessions     : ${cycleOffPeakSessions.length}`
  );

  console.log(
    `On-peak overlaps      : ${cycleOnPeakSessions.length}`
  );

  console.log(
    `Total charging time   : ${formatDuration(
      cycleMinutes
    )}`
  );

  console.log(
    `Total energy          : ${cycleEnergy.toFixed(
      2
    )} kWh`
  );

  console.log(
    `On-peak minutes       : ${cycleOnPeakMinutes}`
  );

  console.log(
    `Est. on-peak energy   : ${cycleEstimatedOnPeakEnergy.toFixed(
      2
    )} kWh`
  );

  // -------------------------------------------------------
  // LATEST SESSION
  // -------------------------------------------------------

  console.log("");
  console.log(
    "LATEST CHARGING SESSION"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Started              : ${formatTimestamp(
      latest.startTime
    )}`
  );

  console.log(
    `Duration             : ${formatDuration(
      latest.durationMinutes
    )}`
  );

  console.log(
    `Energy               : ${latest.energyKwh.toFixed(
      2
    )} kWh`
  );

  console.log(
    `Average charge rate  : ${latest.averageKw.toFixed(
      2
    )} kW`
  );

  console.log(
    `APS overlap          : ${
      latest.onPeakOverlapMinutes > 0
        ? "YES"
        : "NO"
    }`
  );

  if (
    latest.onPeakOverlapMinutes > 0
  ) {
    console.log(
      `Overlap minutes      : ${latest.onPeakOverlapMinutes}`
    );

    console.log(
      `Est. on-peak energy  : ${latest.estimatedOnPeakKwh.toFixed(
        2
      )} kWh`
    );
  }

  console.log("");
}

main();