import fs from "node:fs";
import path from "node:path";

import energy from "../../../data/energy.json";

export type TeslaChargingSession = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  energyKwh: number;
  averageKw: number;
  onPeakOverlapMinutes: number;
  estimatedOnPeakKwh: number;
  source: string;
};

export type TeslaChargingAnalysis = {
  available: boolean;
  cycleStart: string;

  history: {
    sessions: number;
    totalEnergyKwh: number;
    totalChargingMinutes: number;
    offPeakSessions: number;
    onPeakOverlapSessions: number;
    onPeakOverlapMinutes: number;
    estimatedOnPeakEnergyKwh: number;
  };

  currentCycle: {
    sessions: number;
    totalEnergyKwh: number;
    totalChargingMinutes: number;
    offPeakSessions: number;
    onPeakOverlapSessions: number;
    onPeakOverlapMinutes: number;
    estimatedOnPeakEnergyKwh: number;
  };

  latestSession: TeslaChargingSession | null;
};

const HISTORY_FILE = path.resolve(
  process.cwd(),
  "data/history/tesla/charging.csv"
);

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

// ---------------------------------------------------------
// HISTORY
// ---------------------------------------------------------

function readHistory(): TeslaChargingSession[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
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
// SUMMARY
// ---------------------------------------------------------

function summarize(
  sessions: TeslaChargingSession[]
) {
  const onPeakSessions = sessions.filter(
    (session) =>
      session.onPeakOverlapMinutes > 0
  );

  const offPeakSessions = sessions.filter(
    (session) =>
      session.onPeakOverlapMinutes === 0
  );

  return {
    sessions: sessions.length,

    totalEnergyKwh: sessions.reduce(
      (sum, session) =>
        sum + session.energyKwh,
      0
    ),

    totalChargingMinutes: sessions.reduce(
      (sum, session) =>
        sum + session.durationMinutes,
      0
    ),

    offPeakSessions: offPeakSessions.length,

    onPeakOverlapSessions:
      onPeakSessions.length,

    onPeakOverlapMinutes:
      onPeakSessions.reduce(
        (sum, session) =>
          sum +
          session.onPeakOverlapMinutes,
        0
      ),

    estimatedOnPeakEnergyKwh:
      onPeakSessions.reduce(
        (sum, session) =>
          sum +
          session.estimatedOnPeakKwh,
        0
      ),
  };
}

// ---------------------------------------------------------
// ANALYSIS
// ---------------------------------------------------------

export function analyzeTeslaCharging():
  TeslaChargingAnalysis {
  const sessions = readHistory();

  const cycleStart =
    energy.energy.currentCycleStart;

  if (sessions.length === 0) {
    return {
      available: false,
      cycleStart,

      history: summarize([]),

      currentCycle: summarize([]),

      latestSession: null,
    };
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  const latestSession =
    sorted[sorted.length - 1];

  const cycleSessions = sessions.filter(
    (session) =>
      session.startTime.slice(0, 10) >=
      cycleStart
  );

  return {
    available: true,
    cycleStart,

    history: summarize(sessions),

    currentCycle:
      summarize(cycleSessions),

    latestSession,
  };
}