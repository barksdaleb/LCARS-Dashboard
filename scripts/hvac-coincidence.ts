import fs from "fs";
import path from "path";

type EcobeeRow = {
  timestamp: Date;
  date: string;
  hour: number;
  minute: number;

  indoorTemp: number;
  outdoorTemp: number;
  setpoint: number;

  runtimeSeconds: number;
};

type Interval = {
  date: string;
  hour: number;
  minute: number;
  frontSeconds: number;
  hallSeconds: number;
};

type APSHourlyRecord = {
  timestamp: string;
  date: string;
  time: string;
  usageKWh: number;
  demandKW: number;
};

function loadAPSHistory(): APSHourlyRecord[] {
  const filename = path.join(
    process.cwd(),
    "data/history/aps/hourly.csv"
  );

  if (!fs.existsSync(filename)) {
    return [];
  }

  const csv = fs.readFileSync(filename, "utf8");

  const lines = csv
    .split(/\r?\n/)
    .filter(Boolean);

  // Remove header.
  lines.shift();

  const records: APSHourlyRecord[] = [];

  for (const line of lines) {
    const values = line.split(",");

    const demandKW = Number(values[4]);

    if (
      !values[1] ||
      !values[2] ||
      !Number.isFinite(demandKW)
    ) {
      continue;
    }

    records.push({
      timestamp: values[0],
      date: values[1],
      time: values[2],
      usageKWh: Number(values[3]),
      demandKW,
    });
  }

  return records;
}

function getAPSDemand(
  records: APSHourlyRecord[],
  date: string,
  hour: number
): number | null {
  const row = records.find((record) => {
    if (record.date !== date) {
      return false;
    }

    const recordHour =
      Number(record.time.split(":")[0]);

    return recordHour === hour;
  });

  return row?.demandKW ?? null;
}

function getPhoenixParts(timestamp: Date) {
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

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  if (
    !year ||
    !month ||
    !day ||
    hour === undefined ||
    minute === undefined
  ) {
    return null;
  }

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(hour),
    minute: Number(minute),
  };
}

function loadEcobee(filename: string): EcobeeRow[] {
  const csv = fs.readFileSync(filename, "utf8");

  const lines = csv
    .split(/\r?\n/)
    .filter(Boolean);

  // Remove normalized-history header.
  lines.shift();

  const rows: EcobeeRow[] = [];

  for (const line of lines) {
    const values = line.split(",");

const timestamp = new Date(values[0]);

const indoorTemp = Number(values[2]);
const outdoorTemp = Number(values[3]);
const setpoint = Number(values[5]);

const runtimeSeconds = Number(values[6]);

   if (
  Number.isNaN(timestamp.getTime()) ||
  !Number.isFinite(indoorTemp) ||
  !Number.isFinite(runtimeSeconds)
) {
  continue;
}

    const phoenix = getPhoenixParts(timestamp);

    if (!phoenix) {
      continue;
    }

rows.push({
  timestamp,
  date: phoenix.date,
  hour: phoenix.hour,
  minute: phoenix.minute,

  indoorTemp,
  outdoorTemp,
  setpoint,

  runtimeSeconds,
});
  }

  return rows;
}

function key(row: EcobeeRow): string {
  return `${row.date}-${String(row.hour).padStart(
    2,
    "0"
  )}:${String(row.minute).padStart(2, "0")}`;
}

const historyDir = path.join(
  process.cwd(),
  "data/history/ecobee"
);

const frontRows = loadEcobee(
  path.join(historyDir, "front-ac.csv")
);

const hallRows = loadEcobee(
  path.join(historyDir, "hall-ac.csv")
);

const apsRows =
  loadAPSHistory();

// Use requested date, otherwise newest complete date
// existing in both thermostat histories.

const requestedDate = process.argv[2];

const frontDates = new Set(
  frontRows.map((row) => row.date)
);

const hallDates = new Set(
  hallRows.map((row) => row.date)
);

const commonDates = [...frontDates]
  .filter((date) => hallDates.has(date))
  .sort();

if (!commonDates.length) {
  throw new Error(
    "No common Front/Hall Ecobee dates found."
  );
}

const TARGET_DATE =
  requestedDate ??
  commonDates[commonDates.length - 1];

const frontPeak = frontRows.filter(
  (row) =>
    row.date === TARGET_DATE &&
    row.hour >= 16 &&
    row.hour < 19
);

const hallPeak = hallRows.filter(
  (row) =>
    row.date === TARGET_DATE &&
    row.hour >= 16 &&
    row.hour < 19
);

if (!frontPeak.length || !hallPeak.length) {
  throw new Error(
    `No complete 4–7 PM data found for ${TARGET_DATE}.`
  );
}

const frontMap = new Map(
  frontPeak.map((row) => [key(row), row])
);

const hallMap = new Map(
  hallPeak.map((row) => [key(row), row])
);

const intervalKeys = [
  ...new Set([
    ...frontMap.keys(),
    ...hallMap.keys(),
  ]),
].sort();

const intervals: Interval[] = [];

for (const intervalKey of intervalKeys) {
  const front = frontMap.get(intervalKey);
  const hall = hallMap.get(intervalKey);

  // Only compare intervals represented by BOTH systems.
  if (!front || !hall) {
    continue;
  }

  intervals.push({
    date: TARGET_DATE,
    hour: front.hour,
    minute: front.minute,
    frontSeconds: Math.min(
      300,
      Math.max(0, front.runtimeSeconds)
    ),
    hallSeconds: Math.min(
      300,
      Math.max(0, hall.runtimeSeconds)
    ),
  });
}

if (!intervals.length) {
  throw new Error(
    `No matching Front/Hall intervals for ${TARGET_DATE}.`
  );
}

const frontRuntimeSeconds = intervals.reduce(
  (sum, row) => sum + row.frontSeconds,
  0
);

const hallRuntimeSeconds = intervals.reduce(
  (sum, row) => sum + row.hallSeconds,
  0
);

// We know how many seconds each compressor ran during
// each five-minute bucket, but not their exact second-by-
// second positions inside that bucket.
//
// Therefore calculate the mathematically guaranteed
// minimum overlap and possible maximum overlap.

const minimumOverlapSeconds = intervals.reduce(
  (sum, row) =>
    sum +
    Math.max(
      0,
      row.frontSeconds +
        row.hallSeconds -
        300
    ),
  0
);

const maximumOverlapSeconds = intervals.reduce(
  (sum, row) =>
    sum +
    Math.min(
      row.frontSeconds,
      row.hallSeconds
    ),
  0
);

function overlapForHour(hour: number) {
  const rows = intervals.filter(
    (row) => row.hour === hour
  );

  const minimum = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        row.frontSeconds +
          row.hallSeconds -
          300
      ),
    0
  );

  const maximum = rows.reduce(
    (sum, row) =>
      sum +
      Math.min(
        row.frontSeconds,
        row.hallSeconds
      ),
    0
  );

  return {
    minimumMinutes: minimum / 60,
    maximumMinutes: maximum / 60,
  };
}

const totalWindowSeconds =
  intervals.length * 300;

const minimumOverlapRate =
  totalWindowSeconds > 0
    ? (minimumOverlapSeconds /
        totalWindowSeconds) *
      100
    : 0;

const maximumOverlapRate =
  totalWindowSeconds > 0
    ? (maximumOverlapSeconds /
        totalWindowSeconds) *
      100
    : 0;

console.log("");
console.log("========================================");
console.log("       HVAC COINCIDENCE ANALYSIS");
console.log(`       ${TARGET_DATE}  4–7 PM`);
console.log("========================================");
console.log("");

console.log(
  `Intervals compared  : ${intervals.length}`
);

console.log(
  `Front runtime       : ${(frontRuntimeSeconds / 60).toFixed(
    1
  )} min`
);

console.log(
  `Hall runtime        : ${(hallRuntimeSeconds / 60).toFixed(
    1
  )} min`
);

console.log("");

console.log("OVERLAP");
console.log("----------------------------------------");

console.log(
  `Guaranteed overlap  : ${(minimumOverlapSeconds / 60).toFixed(
    1
  )} min`
);

console.log(
  `Possible overlap    : ${(maximumOverlapSeconds / 60).toFixed(
    1
  )} min`
);

console.log(
  `Overlap range       : ${minimumOverlapRate.toFixed(
    1
  )}% – ${maximumOverlapRate.toFixed(1)}%`
);

console.log("");
console.log("BY HOUR");
console.log("----------------------------------------");
console.log(
  "HOUR".padEnd(12) +
  "OVERLAP".padEnd(18) +
  "APS DEMAND"
);

let peakAPSDemand: number | null = null;
let peakAPSDisplayHour: string | null = null;
let peakAPSOverlapMinimum: number | null = null;
let peakAPSOverlapMaximum: number | null = null;

for (const hour of [16, 17, 18]) {
  const overlap = overlapForHour(hour);

  const displayHour =
    hour === 16
      ? "4–5 PM"
      : hour === 17
        ? "5–6 PM"
        : "6–7 PM";

  const apsDemand =
    getAPSDemand(
      apsRows,
      TARGET_DATE,
      hour
    );

  console.log(
    displayHour.padEnd(12) +
      `${overlap.minimumMinutes.toFixed(1)}–${overlap.maximumMinutes.toFixed(
        1
      )} min`.padEnd(18) +
      (apsDemand === null
        ? "--"
        : `${apsDemand.toFixed(2)} kW`)
  );

  if (
    apsDemand !== null &&
    (
      peakAPSDemand === null ||
      apsDemand > peakAPSDemand
    )
  ) {
    peakAPSDemand = apsDemand;
    peakAPSDisplayHour = displayHour;
    peakAPSOverlapMinimum =
      overlap.minimumMinutes;
    peakAPSOverlapMaximum =
      overlap.maximumMinutes;
  }
}

console.log("");

if (peakAPSDemand !== null) {
  console.log("APS PEAK HOUR");
  console.log("----------------------------------------");

  console.log(
    `Peak hour           : ${peakAPSDisplayHour}`
  );

  console.log(
    `APS demand          : ${peakAPSDemand.toFixed(
      2
    )} kW`
  );

  console.log(
    `AC overlap          : ${peakAPSOverlapMinimum!.toFixed(
      1
    )}–${peakAPSOverlapMaximum!.toFixed(
      1
    )} min`
  );
} else {
  console.log("APS PEAK HOUR");
  console.log("----------------------------------------");
  console.log(
    "APS data            : Not available"
  );
}

console.log("");
console.log("INTERPRETATION");
console.log("----------------------------------------");

if (minimumOverlapRate >= 25) {
  console.log(
    "Staggering potential: HIGH"
  );
} else if (maximumOverlapRate >= 20) {
  console.log(
    "Staggering potential: MEDIUM"
  );
} else {
  console.log(
    "Staggering potential: LOW"
  );
}

console.log("");
console.log(
  "Note: Ecobee provides compressor runtime within"
);
console.log(
  "each 5-minute interval, not second-by-second timing."
);
console.log(
  "The overlap is therefore reported as a defensible range."
);
console.log("========================================");
console.log("");
// ======================================================
// Historical HVAC / APS coincidence analysis
// ======================================================

type HistoricalObservation = {
  date: string;
  hour: number;
  overlapMinutes: number;
  apsDemand: number;
  outdoorTemp: number;
};

function isWeekday(date: string): boolean {
  // Noon prevents timezone/date-boundary weirdness.
  const day = new Date(
    `${date}T12:00:00-07:00`
  ).getDay();

  return day >= 1 && day <= 5;
}

function getAverageOutdoorTempForHour(
  rows: EcobeeRow[],
  date: string,
  hour: number
): number | null {
  const temperatures = rows
    .filter(
      (row) =>
        row.date === date &&
        row.hour === hour &&
        Number.isFinite(row.outdoorTemp) &&
        row.outdoorTemp > 0
    )
    .map(
      (row) => row.outdoorTemp
    );

  if (!temperatures.length) {
    return null;
  }

  return average(temperatures);
}

function buildHistoricalObservations():
  HistoricalObservation[] {

  const observations: HistoricalObservation[] = [];

  for (const date of commonDates) {
    if (!isWeekday(date)) {
      continue;
    }

    const frontDateRows = frontRows.filter(
      (row) =>
        row.date === date &&
        row.hour >= 16 &&
        row.hour < 19
    );

    const hallDateRows = hallRows.filter(
      (row) =>
        row.date === date &&
        row.hour >= 16 &&
        row.hour < 19
    );

    const frontDateMap = new Map(
      frontDateRows.map((row) => [key(row), row])
    );

    const hallDateMap = new Map(
      hallDateRows.map((row) => [key(row), row])
    );

    for (const hour of [16, 17, 18]) {
      let guaranteedOverlapSeconds = 0;
      let matchedIntervals = 0;

      for (let minute = 0; minute < 60; minute += 5) {
        const intervalKey =
          `${date}-${String(hour).padStart(2, "0")}:` +
          `${String(minute).padStart(2, "0")}`;

        const front =
          frontDateMap.get(intervalKey);

        const hall =
          hallDateMap.get(intervalKey);

        if (!front || !hall) {
          continue;
        }

        matchedIntervals++;

        const frontSeconds = Math.min(
          300,
          Math.max(0, front.runtimeSeconds)
        );

        const hallSeconds = Math.min(
          300,
          Math.max(0, hall.runtimeSeconds)
        );

        guaranteedOverlapSeconds +=
          Math.max(
            0,
            frontSeconds +
              hallSeconds -
              300
          );
      }

      // Require all twelve 5-minute intervals.
      // This prevents partial hours from contaminating
      // the historical comparison.
      if (matchedIntervals !== 12) {
        continue;
      }

      const apsDemand =
        getAPSDemand(
          apsRows,
          date,
          hour
        );

     if (apsDemand === null) {
  continue;
}

const outdoorTemp =
  getAverageOutdoorTempForHour(
    frontRows,
    date,
    hour
  );

if (outdoorTemp === null) {
  continue;
}

observations.push({
  date,
  hour,
  overlapMinutes:
    guaranteedOverlapSeconds / 60,
  apsDemand,
  outdoorTemp,
});
    }
  }

  return observations;
}

function pearsonCorrelation(
  x: number[],
  y: number[]
): number | null {
  if (
    x.length !== y.length ||
    x.length < 2
  ) {
    return null;
  }

  const meanX =
    x.reduce((sum, value) => sum + value, 0) /
    x.length;

  const meanY =
    y.reduce((sum, value) => sum + value, 0) /
    y.length;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < x.length; i++) {
    const differenceX = x[i] - meanX;
    const differenceY = y[i] - meanY;

    numerator +=
      differenceX * differenceY;

    denominatorX +=
      differenceX * differenceX;

    denominatorY +=
      differenceY * differenceY;
  }

  const denominator =
    Math.sqrt(
      denominatorX * denominatorY
    );

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

const historical =
  buildHistoricalObservations();

if (historical.length) {
  const historicalDates = [
    ...new Set(
      historical.map(
        (observation) => observation.date
      )
    ),
  ];

  const correlation =
    pearsonCorrelation(
      historical.map(
        (observation) =>
          observation.overlapMinutes
      ),
      historical.map(
        (observation) =>
          observation.apsDemand
      )
    );

  const sortedByOverlap =
    [...historical].sort(
      (a, b) =>
        a.overlapMinutes -
        b.overlapMinutes
    );

  const groupSize =
    Math.max(
      1,
      Math.floor(
        sortedByOverlap.length / 3
      )
    );

  const lowOverlap =
    sortedByOverlap.slice(
      0,
      groupSize
    );

  const highOverlap =
    sortedByOverlap.slice(
      -groupSize
    );

  const lowOverlapMinutes =
    average(
      lowOverlap.map(
        (row) => row.overlapMinutes
      )
    );

  const lowOverlapDemand =
    average(
      lowOverlap.map(
        (row) => row.apsDemand
      )
    );

  const highOverlapMinutes =
    average(
      highOverlap.map(
        (row) => row.overlapMinutes
      )
    );

  const highOverlapDemand =
    average(
      highOverlap.map(
        (row) => row.apsDemand
      )
    );

  let relationship = "UNKNOWN";

  if (correlation !== null) {
    const magnitude =
      Math.abs(correlation);

    if (magnitude >= 0.7) {
      relationship = "STRONG";
    } else if (magnitude >= 0.4) {
      relationship = "MODERATE";
    } else if (magnitude >= 0.2) {
      relationship = "WEAK";
    } else {
      relationship = "VERY WEAK";
    }
  }

  console.log("");
  console.log("========================================");
  console.log(
    " HVAC COINCIDENCE — HISTORICAL ANALYSIS"
  );
  console.log("========================================");
  console.log("");

  console.log(
    `Weekdays analyzed   : ${historicalDates.length}`
  );

  console.log(
    `Hourly observations : ${historical.length}`
  );

  console.log("");

  console.log("CORRELATION");
  console.log("----------------------------------------");

  console.log(
    `Overlap vs demand   : ${
      correlation === null
        ? "--"
        : correlation.toFixed(3)
    }`
  );

  console.log(
    `Relationship        : ${relationship}`
  );

  console.log("");

  console.log("LOW OVERLAP HOURS");
  console.log("----------------------------------------");

  console.log(
    `Observations        : ${lowOverlap.length}`
  );

  console.log(
    `Avg overlap         : ${lowOverlapMinutes.toFixed(
      1
    )} min`
  );

  console.log(
    `Avg APS demand      : ${lowOverlapDemand.toFixed(
      2
    )} kW`
  );

  console.log("");

  console.log("HIGH OVERLAP HOURS");
  console.log("----------------------------------------");

  console.log(
    `Observations        : ${highOverlap.length}`
  );

  console.log(
    `Avg overlap         : ${highOverlapMinutes.toFixed(
      1
    )} min`
  );

  console.log(
    `Avg APS demand      : ${highOverlapDemand.toFixed(
      2
    )} kW`
  );

  console.log("");

  console.log("DEMAND DIFFERENCE");
  console.log("----------------------------------------");

  console.log(
    `High vs low overlap : ${(
      highOverlapDemand -
      lowOverlapDemand
    ).toFixed(2)} kW`
  );

  const percentDifference =
    lowOverlapDemand > 0
      ? (
          (highOverlapDemand -
            lowOverlapDemand) /
          lowOverlapDemand
        ) * 100
      : 0;

  console.log(
    `Demand increase     : ${percentDifference.toFixed(
      1
    )}%`
  );

  console.log("");

  console.log("HOME OPS ASSESSMENT");
  console.log("----------------------------------------");

  if (
    correlation !== null &&
    correlation >= 0.4 &&
    highOverlapDemand >
      lowOverlapDemand
  ) {
    console.log(
      "HVAC staggering opportunity: SUPPORTED"
    );
  } else if (
    highOverlapDemand >
    lowOverlapDemand
  ) {
    console.log(
      "HVAC staggering opportunity: POSSIBLE"
    );
  } else {
    console.log(
      "HVAC staggering opportunity: NOT PROVEN"
    );
  }

  console.log("========================================");
  console.log("");
}

// ======================================================
// Weather-controlled HVAC coincidence analysis
// ======================================================

if (historical.length) {
  const TEMP_BAND_SIZE = 5;

  type TemperatureBand = {
    minimum: number;
    maximum: number;
    observations: HistoricalObservation[];
  };

  const temperatures =
    historical.map(
      (row) => row.outdoorTemp
    );

  const minimumTemperature =
    Math.floor(
      Math.min(...temperatures) /
        TEMP_BAND_SIZE
    ) * TEMP_BAND_SIZE;

  const maximumTemperature =
    Math.ceil(
      Math.max(...temperatures) /
        TEMP_BAND_SIZE
    ) * TEMP_BAND_SIZE;

  const bands: TemperatureBand[] = [];

  for (
    let minimum = minimumTemperature;
    minimum < maximumTemperature;
    minimum += TEMP_BAND_SIZE
  ) {
    const maximum =
      minimum + TEMP_BAND_SIZE;

    const observations =
      historical.filter(
        (row) =>
          row.outdoorTemp >= minimum &&
          (
            row.outdoorTemp < maximum ||
            (
              maximum === maximumTemperature &&
              row.outdoorTemp <= maximum
            )
          )
      );

    if (observations.length >= 4) {
      bands.push({
        minimum,
        maximum,
        observations,
      });
    }
  }

  type WeatherComparison = {
    band: string;
    lowCount: number;
    highCount: number;
    lowOverlap: number;
    highOverlap: number;
    lowDemand: number;
    highDemand: number;
  };

  const comparisons: WeatherComparison[] = [];

  for (const band of bands) {
    const sorted =
      [...band.observations].sort(
        (a, b) =>
          a.overlapMinutes -
          b.overlapMinutes
      );

    const half =
      Math.floor(sorted.length / 2);

    if (half < 2) {
      continue;
    }

    const low =
      sorted.slice(0, half);

    const high =
      sorted.slice(-half);

    comparisons.push({
      band:
        `${band.minimum}–${band.maximum}°F`,

      lowCount: low.length,
      highCount: high.length,

      lowOverlap:
        average(
          low.map(
            (row) =>
              row.overlapMinutes
          )
        ),

      highOverlap:
        average(
          high.map(
            (row) =>
              row.overlapMinutes
          )
        ),

      lowDemand:
        average(
          low.map(
            (row) =>
              row.apsDemand
          )
        ),

      highDemand:
        average(
          high.map(
            (row) =>
              row.apsDemand
          )
        ),
    });
  }

  console.log("");
  console.log("========================================");
  console.log(
    " WEATHER-CONTROLLED HVAC COINCIDENCE"
  );
  console.log("========================================");
  console.log("");

  console.log(
    `Temperature bands   : ${comparisons.length}`
  );

  console.log(
    `Band size           : ${TEMP_BAND_SIZE}°F`
  );

  console.log("");

  console.log("BY TEMPERATURE");
  console.log("----------------------------------------");

  for (const comparison of comparisons) {
    console.log("");
    console.log(comparison.band);

    console.log(
      `  Low overlap       : ${comparison.lowOverlap.toFixed(
        1
      )} min / ${comparison.lowDemand.toFixed(
        2
      )} kW`
    );

    console.log(
      `  High overlap      : ${comparison.highOverlap.toFixed(
        1
      )} min / ${comparison.highDemand.toFixed(
        2
      )} kW`
    );

    console.log(
      `  Demand difference : ${(
        comparison.highDemand -
        comparison.lowDemand
      ).toFixed(2)} kW`
    );
  }

  const validComparisons =
    comparisons.filter(
      (comparison) =>
        comparison.highOverlap >
        comparison.lowOverlap
    );

  const averageLowDemand =
    validComparisons.length
      ? average(
          validComparisons.map(
            (comparison) =>
              comparison.lowDemand
          )
        )
      : 0;

  const averageHighDemand =
    validComparisons.length
      ? average(
          validComparisons.map(
            (comparison) =>
              comparison.highDemand
          )
        )
      : 0;

  const adjustedDifference =
    averageHighDemand -
    averageLowDemand;

  const positiveBands =
    validComparisons.filter(
      (comparison) =>
        comparison.highDemand >
        comparison.lowDemand
    ).length;

  console.log("");
  console.log("WEATHER-CONTROLLED RESULT");
  console.log("----------------------------------------");

  console.log(
    `Bands compared      : ${validComparisons.length}`
  );

  console.log(
    `Positive bands      : ${positiveBands}/${validComparisons.length}`
  );

  console.log(
    `Low-overlap demand  : ${averageLowDemand.toFixed(
      2
    )} kW`
  );

  console.log(
    `High-overlap demand : ${averageHighDemand.toFixed(
      2
    )} kW`
  );

  console.log(
    `Adjusted difference : ${adjustedDifference >= 0 ? "+" : ""}${adjustedDifference.toFixed(
      2
    )} kW`
  );

  console.log("");

  console.log("HOME OPS ASSESSMENT");
  console.log("----------------------------------------");

  if (
    validComparisons.length >= 3 &&
    positiveBands /
      validComparisons.length >=
      0.75 &&
    adjustedDifference >= 1
  ) {
    console.log(
      "Weather-controlled evidence: STRONG"
    );

    console.log(
      "HVAC staggering test        : RECOMMENDED"
    );
  } else if (
    validComparisons.length >= 2 &&
    positiveBands >
      validComparisons.length / 2 &&
    adjustedDifference > 0
  ) {
    console.log(
      "Weather-controlled evidence: MODERATE"
    );

    console.log(
      "HVAC staggering test        : WORTH TESTING"
    );
  } else {
    console.log(
      "Weather-controlled evidence: WEAK"
    );

    console.log(
      "HVAC staggering test        : NOT YET JUSTIFIED"
    );
  }

  console.log("========================================");
  console.log("");
}

// ======================================================
// Home Ops HVAC Thermal Headroom Advisor
// ======================================================

type AdvisorDecision =
  | "DEFER FRONT"
  | "DEFER HALL"
  | "ALLOW BOTH";

type AdvisorEvent = {
  time: string;
  hour: number;
  minute: number;

  frontTemp: number;
  
  frontSetpoint: number;
  frontHeadroom: number;

  hallTemp: number;
  hallSetpoint: number;
  hallHeadroom: number;

  decision: AdvisorDecision;
  reason: string;
};

function formatAdvisorTime(
  hour: number,
  minute: number
): string {
  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return (
    `${displayHour}:` +
    `${String(minute).padStart(2, "0")} ` +
    period
  );
}

function buildAdvisorEvents(
  date: string
): AdvisorEvent[] {
  const events: AdvisorEvent[] = [];

  const frontMap = new Map(
    frontRows
      .filter(
        (row) =>
          row.date === date &&
          row.hour >= 16 &&
          row.hour < 19
      )
      .map(
        (row) => [key(row), row]
      )
  );

  const hallMap = new Map(
    hallRows
      .filter(
        (row) =>
          row.date === date &&
          row.hour >= 16 &&
          row.hour < 19
      )
      .map(
        (row) => [key(row), row]
      )
  );

 // Maximum temporary temperature Home Ops would
// permit during a staggering intervention.
//
// This is NOT the normal Ecobee setpoint.
// Normal peak target remains 75°F.
const MAX_STAGGER_TEMP = 76.0;

// Require at least this much thermal reserve before
// recommending that a zone be deferred.
const MINIMUM_RESERVE = 0.5;

  for (const [intervalKey, front] of frontMap) {
    const hall =
      hallMap.get(intervalKey);

    if (!hall) {
      continue;
    }

    // Advisor only cares about intervals where
    // both compressors actually ran.
    if (
      front.runtimeSeconds <= 0 ||
      hall.runtimeSeconds <= 0
    ) {
      continue;
    }

    if (
      !Number.isFinite(front.setpoint) ||
      !Number.isFinite(hall.setpoint)
    ) {
      continue;
    }

  const frontHeadroom =
  MAX_STAGGER_TEMP -
  front.indoorTemp;

const hallHeadroom =
  MAX_STAGGER_TEMP -
  hall.indoorTemp;

let decision: AdvisorDecision;
let reason: string;

if (
  frontHeadroom < MINIMUM_RESERVE &&
  hallHeadroom < MINIMUM_RESERVE
) {
          decision = "ALLOW BOTH";

      reason =
        "Neither zone has enough thermal reserve";
    } else if (
      frontHeadroom >
      hallHeadroom
    ) {
      decision = "DEFER FRONT";

      reason =
        "Front has greater thermal reserve";
    } else if (
      hallHeadroom >
      frontHeadroom
    ) {
      decision = "DEFER HALL";

      reason =
        "Hall has greater thermal reserve";
    } else {
      decision = "ALLOW BOTH";

      reason =
        "Thermal reserve is equal";
    }

    events.push({
  time:
    formatAdvisorTime(
      front.hour,
      front.minute
    ),

  hour: front.hour,
  minute: front.minute,

  frontTemp:
    front.indoorTemp,

      frontSetpoint:
        front.setpoint,

      frontHeadroom,

      hallTemp:
        hall.indoorTemp,

      hallSetpoint:
        hall.setpoint,

      hallHeadroom,

      decision,
      reason,
    });
  }

  return events;
}

const advisorEvents =
  buildAdvisorEvents(TARGET_DATE);

console.log("");
console.log("========================================");
console.log("       HOME OPS HVAC ADVISOR");
console.log(`       ${TARGET_DATE}  4–7 PM`);
console.log("========================================");
console.log("");

if (!advisorEvents.length) {
  console.log(
    "No simultaneous cooling events found."
  );
} else {
  for (const event of advisorEvents) {
    console.log(
      `${event.time}  ${event.decision}`
    );

    console.log(
      `  Front ${event.frontTemp.toFixed(
        1
      )}° / ${event.frontSetpoint.toFixed(
        1
      )}°  reserve ${event.frontHeadroom.toFixed(
        1
      )}°`
    );

    console.log(
      `  Hall  ${event.hallTemp.toFixed(
        1
      )}° / ${event.hallSetpoint.toFixed(
        1
      )}°  reserve ${event.hallHeadroom.toFixed(
        1
      )}°`
    );

    console.log(
      `  ${event.reason}`
    );

    console.log("");
  }

  const deferFront =
    advisorEvents.filter(
      (event) =>
        event.decision === "DEFER FRONT"
    ).length;

  const deferHall =
    advisorEvents.filter(
      (event) =>
        event.decision === "DEFER HALL"
    ).length;

  const allowBoth =
    advisorEvents.filter(
      (event) =>
        event.decision === "ALLOW BOTH"
    ).length;

  console.log("SUMMARY");
  console.log("----------------------------------------");

  console.log(
    `Both-AC intervals   : ${advisorEvents.length}`
  );

  console.log(
    `Defer Front         : ${deferFront}`
  );

  console.log(
    `Defer Hall          : ${deferHall}`
  );

  console.log(
    `Allow both          : ${allowBoth}`
  );

  console.log("");

  console.log(
    `Potential stagger   : ${
      deferFront + deferHall
    }/${advisorEvents.length} intervals`
  );
const staggerIntervals =
  deferFront + deferHall;

// Each Ecobee interval represents five minutes.
// This is the theoretical maximum amount of
// simultaneous compressor runtime Home Ops
// identified as potentially deferrable.
const potentialStaggerMinutes =
  staggerIntervals * 5;

const overlapReductionPercent =
  maximumOverlapSeconds > 0
    ? Math.min(
        100,
        (potentialStaggerMinutes /
          (maximumOverlapSeconds / 60)) *
          100
      )
    : 0;

console.log("");

console.log("STAGGERING SIMULATION");
console.log("----------------------------------------");

console.log(
  `Candidate intervals : ${staggerIntervals}`
);

console.log(
  `Candidate minutes   : ${potentialStaggerMinutes.toFixed(
    1
  )} min`
);

console.log(
  `Current overlap     : ${(
    maximumOverlapSeconds / 60
  ).toFixed(1)} min`
);

console.log(
  `Theoretical impact  : up to ${overlapReductionPercent.toFixed(
    1
  )}% of overlap`
);

console.log("");
console.log(
  "Note: Candidate minutes are a theoretical ceiling."
);
console.log(
  "Actual staggering would use shorter deferrals"
);
console.log(
  "and stop if either zone approached 76°F."
);
}

console.log("========================================");
console.log("");
// ======================================================
// Home Ops Ecobee Schedule Advisor
// Historical 30-minute staggering analysis
// ======================================================

type ScheduleBlock = {
  hour: number;
  minute: number;
  deferFront: number;
  deferHall: number;
  allowBoth: number;
  total: number;
};

function isWeekdayDate(date: string): boolean {
  const [year, month, day] =
    date.split("-").map(Number);

  const dateObject =
    new Date(year, month - 1, day);

  const weekday = dateObject.getDay();

  return weekday >= 1 && weekday <= 5;
}

const historicalAdvisorDates =
  commonDates.filter(
    (date) =>
      isWeekdayDate(date) &&
      date < TARGET_DATE
  );

const scheduleBlocks =
  new Map<string, ScheduleBlock>();

for (const date of historicalAdvisorDates) {
  const events =
    buildAdvisorEvents(date);

  for (const event of events) {
    // Collapse 5-minute Ecobee observations
    // into 30-minute schedule blocks.
    const blockMinute =
      event.minute < 30 ? 0 : 30;

    const blockKey =
      `${event.hour}:${blockMinute}`;

    let block =
      scheduleBlocks.get(blockKey);

    if (!block) {
      block = {
        hour: event.hour,
        minute: blockMinute,
        deferFront: 0,
        deferHall: 0,
        allowBoth: 0,
        total: 0,
      };

      scheduleBlocks.set(
        blockKey,
        block
      );
    }

    block.total++;

    if (
      event.decision === "DEFER FRONT"
    ) {
      block.deferFront++;
    } else if (
      event.decision === "DEFER HALL"
    ) {
      block.deferHall++;
    } else {
      block.allowBoth++;
    }
  }
}

const orderedScheduleBlocks =
  [...scheduleBlocks.values()].sort(
    (a, b) =>
      a.hour * 60 +
      a.minute -
      (b.hour * 60 + b.minute)
  );

console.log("");
console.log("========================================");
console.log(" HOME OPS ECOBEE SCHEDULE ADVISOR");
console.log(" HISTORICAL 30-MINUTE ANALYSIS");
console.log("========================================");
console.log("");

console.log(
  `Weekdays analyzed   : ${historicalAdvisorDates.length}`
);

console.log("");
console.log(
  "TIME".padEnd(12) +
  "FRONT".padEnd(10) +
  "HALL".padEnd(10) +
  "BOTH".padEnd(10) +
  "RECOMMENDATION"
);

console.log(
  "------------------------------------------------------------"
);

for (const block of orderedScheduleBlocks) {
  const frontRate =
    block.total > 0
      ? block.deferFront /
        block.total
      : 0;

  const hallRate =
    block.total > 0
      ? block.deferHall /
        block.total
      : 0;

  const bothRate =
    block.total > 0
      ? block.allowBoth /
        block.total
      : 0;

  let recommendation:
    | "FAVOR FRONT"
    | "FAVOR HALL"
    | "NO CLEAR FAVOR";

  let confidence: number;

  if (
    frontRate > hallRate &&
    frontRate > bothRate
  ) {
    // DEFER FRONT means Hall gets cooling priority.
    recommendation =
      "FAVOR HALL";

    confidence =
      frontRate * 100;
  } else if (
    hallRate > frontRate &&
    hallRate > bothRate
  ) {
    // DEFER HALL means Front gets cooling priority.
    recommendation =
      "FAVOR FRONT";

    confidence =
      hallRate * 100;
  } else {
    recommendation =
      "NO CLEAR FAVOR";

    confidence =
      Math.max(
        frontRate,
        hallRate,
        bothRate
      ) * 100;
  }

  console.log(
    formatAdvisorTime(
      block.hour,
      block.minute
    ).padEnd(12) +

    `${block.deferFront}`.padEnd(
      10
    ) +

    `${block.deferHall}`.padEnd(
      10
    ) +

    `${block.allowBoth}`.padEnd(
      10
    ) +

    `${recommendation} (${confidence.toFixed(
      0
    )}%)`
  );
}

console.log("");
console.log("INTERPRETATION");
console.log("----------------------------------------");
console.log(
  "FRONT = historical opportunities to defer Front"
);
console.log(
  "HALL  = historical opportunities to defer Hall"
);
console.log(
  "BOTH  = neither zone had enough reserve to defer"
);
console.log("");
console.log(
  "FAVOR FRONT means Home Ops would give Front AC"
);
console.log(
  "cooling priority during that schedule block."
);
console.log(
  "FAVOR HALL means Hall AC receives priority."
);
console.log("========================================");
console.log("");
// ======================================================
// Home Ops Ecobee Schedule Advisor
// ======================================================
//
// Convert the interval-level staggering recommendations
// into something we could actually reproduce with
// Ecobee comfort settings / schedule changes.
//
// This does NOT control Ecobee. It only recommends
// a schedule for a future manual test.

type ScheduleAdvisorHour = {
  hour: number;
  deferFront: number;
  deferHall: number;
  allowBoth: number;
};

const scheduleHours: ScheduleAdvisorHour[] =
  [16, 17, 18].map((hour) => {
    const eventsForHour =
      advisorEvents.filter(
        (event) => event.hour === hour
      );

    return {
      hour,

      deferFront:
        eventsForHour.filter(
          (event) =>
            event.decision === "DEFER FRONT"
        ).length,

      deferHall:
        eventsForHour.filter(
          (event) =>
            event.decision === "DEFER HALL"
        ).length,

      allowBoth:
        eventsForHour.filter(
          (event) =>
            event.decision === "ALLOW BOTH"
        ).length,
    };
  });

console.log("");
console.log("========================================");
console.log("       HOME OPS SCHEDULE ADVISOR");
console.log(`       ${TARGET_DATE}  4–7 PM`);
console.log("========================================");
console.log("");

console.log(
  "Goal: translate staggering opportunities into"
);
console.log(
  "a practical Ecobee schedule experiment."
);
console.log("");

console.log("BY HOUR");
console.log("----------------------------------------");

for (const result of scheduleHours) {
  const displayHour =
    result.hour === 16
      ? "4–5 PM"
      : result.hour === 17
        ? "5–6 PM"
        : "6–7 PM";

  console.log(displayHour);

  console.log(
    `  Defer Front : ${result.deferFront}`
  );

  console.log(
    `  Defer Hall  : ${result.deferHall}`
  );

  console.log(
    `  Allow both  : ${result.allowBoth}`
  );

  console.log("");
}

const totalFront =
  scheduleHours.reduce(
    (sum, hour) =>
      sum + hour.deferFront,
    0
  );

const totalHall =
  scheduleHours.reduce(
    (sum, hour) =>
      sum + hour.deferHall,
    0
  );

console.log("RECOMMENDATION");
console.log("----------------------------------------");

if (totalFront > totalHall) {
  console.log(
    "Primary stagger target : FRONT AC"
  );

  console.log(
    "Test method            : Temporarily raise Front"
  );

  console.log(
    "                         during selected peak periods"
  );
} else if (totalHall > totalFront) {
  console.log(
    "Primary stagger target : HALL AC"
  );

  console.log(
    "Test method            : Temporarily raise Hall"
  );

  console.log(
    "                         during selected peak periods"
  );
} else {
  console.log(
    "Primary stagger target : NONE"
  );

  console.log(
    "More data is needed before choosing a zone."
  );
}

console.log("");
console.log(
  "Normal peak target     : 75°F"
);
console.log(
  "Maximum test target    : 76°F"
);
console.log("");
console.log(
  "Home Ops is advisory only — no Ecobee"
);
console.log(
  "integration is required for this test."
);
console.log("========================================");
console.log("");
// ======================================================
// Home Ops Historical Ecobee Schedule Advisor
// ======================================================
//
// Run the same thermal-reserve advisor across all
// historical weekdays, then determine whether Front
// or Hall consistently has more staggering opportunity
// during each hour of the APS peak window.

type HistoricalScheduleHour = {
  hour: number;
  days: number;
  deferFront: number;
  deferHall: number;
  allowBoth: number;
  totalEvents: number;
};

const historicalScheduleHours:
  HistoricalScheduleHour[] = [];

for (const hour of [16, 17, 18]) {
  let days = 0;
  let deferFront = 0;
  let deferHall = 0;
  let allowBoth = 0;
  let totalEvents = 0;

  for (const date of commonDates) {
    if (!isWeekday(date)) {
      continue;
    }

    // Do not let the target/test day influence
    // the historical recommendation.
    if (date >= TARGET_DATE) {
      continue;
    }

    const events =
      buildAdvisorEvents(date).filter(
        (event) =>
          event.hour === hour
      );

    if (!events.length) {
      continue;
    }

    days++;

    for (const event of events) {
      totalEvents++;

      if (
        event.decision === "DEFER FRONT"
      ) {
        deferFront++;
      } else if (
        event.decision === "DEFER HALL"
      ) {
        deferHall++;
      } else {
        allowBoth++;
      }
    }
  }

  historicalScheduleHours.push({
    hour,
    days,
    deferFront,
    deferHall,
    allowBoth,
    totalEvents,
  });
}

console.log("");
console.log("========================================");
console.log(" HISTORICAL ECOBEE SCHEDULE ADVISOR");
console.log(" BEFORE CURRENT TEST DATE");
console.log("========================================");
console.log("");

console.log(
  "HOUR".padEnd(10) +
  "DAYS".padEnd(8) +
  "FRONT".padEnd(10) +
  "HALL".padEnd(10) +
  "BOTH".padEnd(10) +
  "RESULT"
);

console.log(
  "--------------------------------------------------------------"
);

for (
  const result of historicalScheduleHours
) {
  const displayHour =
    result.hour === 16
      ? "4–5 PM"
      : result.hour === 17
        ? "5–6 PM"
        : "6–7 PM";

  const frontRate =
    result.totalEvents > 0
      ? result.deferFront /
        result.totalEvents
      : 0;

  const hallRate =
    result.totalEvents > 0
      ? result.deferHall /
        result.totalEvents
      : 0;

  let recommendation =
    "NO CLEAR FAVOR";

  let strength = 0;

  if (
    result.deferFront >
    result.deferHall
  ) {
    // More opportunities to defer Front means
    // Hall should receive cooling priority.
    recommendation = "FAVOR HALL";

    strength =
      frontRate * 100;
  } else if (
    result.deferHall >
    result.deferFront
  ) {
    recommendation = "FAVOR FRONT";

    strength =
      hallRate * 100;
  }

  console.log(
    displayHour.padEnd(10) +

    `${result.days}`.padEnd(8) +

    `${result.deferFront}`.padEnd(
      10
    ) +

    `${result.deferHall}`.padEnd(
      10
    ) +

    `${result.allowBoth}`.padEnd(
      10
    ) +

    `${recommendation} (${strength.toFixed(
      0
    )}%)`
  );
}

console.log("");
console.log("WHAT THE COLUMNS MEAN");
console.log("----------------------------------------");

console.log(
  "FRONT = opportunities where Front could defer"
);

console.log(
  "HALL  = opportunities where Hall could defer"
);

console.log(
  "BOTH  = both systems needed cooling"
);

console.log("");
console.log(
  "More FRONT events -> favor Hall cooling."
);

console.log(
  "More HALL events  -> favor Front cooling."
);

console.log("");
console.log(
  "This analysis is advisory only."
);

console.log(
  "No Ecobee integration or control is performed."
);

console.log("========================================");
console.log("");
// ======================================================
// Home Ops Stagger Test Selector
// ======================================================

type StaggerTestCandidate = {
  hour: number;
  deferFront: number;
  deferHall: number;
  allowBoth: number;
  total: number;
  frontShare: number;
  score: number;
};

const staggerCandidates: StaggerTestCandidate[] =
  historicalScheduleHours.map((result) => {
    const total =
      result.deferFront +
      result.deferHall +
      result.allowBoth;

    const frontShare =
      total > 0
        ? result.deferFront / total
        : 0;

    // For our first manual test, favor periods where
    // Front was historically the clear deferral choice.
    //
    // Score is deliberately simple and transparent:
    // percentage of advisor events that said DEFER FRONT.
    const score =
      frontShare * 100;

    return {
      hour: result.hour,
      deferFront: result.deferFront,
      deferHall: result.deferHall,
      allowBoth: result.allowBoth,
      total,
      frontShare,
      score,
    };
  });

const rankedStaggerCandidates =
  [...staggerCandidates].sort(
    (a, b) => b.score - a.score
  );

console.log("");
console.log("========================================");
console.log("       HOME OPS STAGGER TEST SELECTOR");
console.log("========================================");
console.log("");

console.log(
  "HOUR".padEnd(10) +
  "FRONT SHARE".padEnd(16) +
  "SCORE"
);

console.log(
  "----------------------------------------"
);

for (const candidate of rankedStaggerCandidates) {
  const displayHour =
    candidate.hour === 16
      ? "4–5 PM"
      : candidate.hour === 17
        ? "5–6 PM"
        : "6–7 PM";

  console.log(
    displayHour.padEnd(10) +
    `${(
      candidate.frontShare * 100
    ).toFixed(1)}%`.padEnd(16) +
    candidate.score.toFixed(1)
  );
}

const bestCandidate =
  rankedStaggerCandidates[0];

console.log("");
console.log("RECOMMENDED FIRST TEST");
console.log("----------------------------------------");

if (bestCandidate) {
  const displayHour =
    bestCandidate.hour === 16
      ? "4–5 PM"
      : bestCandidate.hour === 17
        ? "5–6 PM"
        : "6–7 PM";

  console.log(
    `Test window          : ${displayHour}`
  );

  console.log(
    "Zone to defer        : FRONT AC"
  );

  console.log(
    "Normal peak target   : 75°F"
  );

  console.log(
    "Test target          : 76°F"
  );

  console.log(
    "Hall target          : 75°F"
  );

  console.log("");
  console.log(
    "Objective            : Reduce simultaneous"
  );
  console.log(
    "                       compressor operation"
  );
  console.log(
    "                       without exceeding 76°F"
  );
}

console.log("========================================");
console.log("");