import path from "path";
import fs from "fs";
import Papa from "papaparse";

import {
  ThermalAnalyzer,
  ThermalAnalysis,
} from "../app/lib/ecobee/ThermalAnalyzer";

import {
  getCountermeasures,
  getCountermeasureById,
} from "./ops-registry";

const historyDir = path.join(
  process.cwd(),
  "data/history/ecobee"
);

const frontAnalyzer = new ThermalAnalyzer(
  path.join(historyDir, "front-ac.csv")
);


type APSHourlyRecord = {
  timestamp: string;
  date: string;
  time: string;
  usageKWh: number;
  demandKW: number;
};

const apsHistoryFile = path.join(
  process.cwd(),
  "data/history/aps/hourly.csv"
);

function loadAPSHistory(): APSHourlyRecord[] {
  const csv = fs.readFileSync(
    apsHistoryFile,
    "utf8"
  );

  const parsed =
    Papa.parse<APSHourlyRecord>(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

  return parsed.data.filter(
    (record) =>
      record.date &&
      record.time &&
      Number.isFinite(record.demandKW)
  );
}

function getAPSPeak4to7(
  records: APSHourlyRecord[],
  date: string
): number | null {
  const rows = records.filter(
    (record) => {
      if (record.date !== date) {
        return false;
      }


      const hour =
        Number(
          record.time.split(":")[0]
        );

      return hour >= 16 && hour < 19;
    }
    
  );


  if (!rows.length) {
    return null;
  }

  return Math.max(
    ...rows.map(
      (record) =>
        Number(record.demandKW)
    )
  );
}

const apsHistory =
  loadAPSHistory();

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

function average(
  values: number[]
): number | null {
  if (!values.length) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

function percentChange(
  before: number,
  after: number
): number {
  return (
    ((after - before) / before) * 100
  );
}

function isWeekday(
  date: string
): boolean {
  const [year, month, day] =
    date.split("-").map(Number);

  const weekday =
    new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

  return weekday >= 1 && weekday <= 5;
}

function isCompleteAnalysis(
  result: ThermalAnalysis
): boolean {
  return (
    result.temp4PM !== null &&
    result.temp7PM !== null &&
    result.averageOutdoorTemp4to7 !== null
  );
}

// ------------------------------------------------------
// Locate Front AC 75°F countermeasure
// ------------------------------------------------------

const countermeasure =
  getCountermeasures().find(
    (item) =>
      item.id === "front-peak-75"
  );

if (!countermeasure) {
  throw new Error(
    "Front AC 75°F countermeasure not found."
  );
}

const startDate =
  countermeasure.startDate;

// ------------------------------------------------------
// Analyze available Front AC history
// ------------------------------------------------------

const dates =
  frontAnalyzer
    .getAvailableDates()
    .filter(isWeekday);

const beforeResults: ThermalAnalysis[] = [];
const afterResults: ThermalAnalysis[] = [];

for (const date of dates) {
  const result =
    frontAnalyzer.analyzeDate(date);

  if (!isCompleteAnalysis(result)) {
    continue;
  }

  if (date < startDate) {
    beforeResults.push(result);
  } else {
    afterResults.push(result);
  }
}

// ------------------------------------------------------
// Baseline selection
//
// Only compare prior days reasonably close in outdoor
// temperature to the post-change period.
// ------------------------------------------------------

const afterOutdoorAverage =
  average(
    afterResults
      .map(
        (result) =>
          result.averageOutdoorTemp4to7
      )
      .filter(
        (value): value is number =>
          value !== null
      )
  );
const baselineCountermeasure =
  countermeasure.baselineCountermeasureId
    ? getCountermeasureById(
        countermeasure.baselineCountermeasureId
      )
    : undefined;

if (
  countermeasure.baselineCountermeasureId &&
  !baselineCountermeasure
) {
  throw new Error(
    `Baseline countermeasure not found: ${countermeasure.baselineCountermeasureId}`
  );
}

const baselineStartDate =
  baselineCountermeasure?.startDate;
const WEATHER_TOLERANCE = 5;

const matchedBefore =
  afterOutdoorAverage === null
    ? []
    : beforeResults.filter(
        (result) =>
          (!baselineStartDate ||
  result.date >= baselineStartDate) &&
          result.averageOutdoorTemp4to7 !== null &&
          Math.abs(
            result.averageOutdoorTemp4to7 -
              afterOutdoorAverage
          ) <= WEATHER_TOLERANCE
      );

// ------------------------------------------------------
// Calculate results
// ------------------------------------------------------
const afterAPSPeaks =
  afterResults
    .map((result) =>
      getAPSPeak4to7(
        apsHistory,
        result.date
      )
    )
    .filter(
      (value): value is number =>
        value !== null
    );

const baselineAPSPeaks =
  matchedBefore
    .map((result) =>
      getAPSPeak4to7(
        apsHistory,
        result.date
      )
    )
    .filter(
      (value): value is number =>
        value !== null
    );

const afterAPSPeak =
  average(afterAPSPeaks);

const baselineAPSPeak =
  average(baselineAPSPeaks);

const apsDemandChange =
  baselineAPSPeak !== null &&
  afterAPSPeak !== null &&
  baselineAPSPeak > 0
    ? percentChange(
        baselineAPSPeak,
        afterAPSPeak
      )
    : null;
const baselineRuntime =
  average(
    matchedBefore.map(
      (result) =>
        result.onPeakRuntimeMinutes
    )
  );

const afterRuntime =
  average(
    afterResults.map(
      (result) =>
        result.onPeakRuntimeMinutes
    )
  );

const after7PMTemp =
  average(
    afterResults
      .map((result) => result.temp7PM)
      .filter(
        (value): value is number =>
          value !== null
      )
  );

const runtimeChange =
  baselineRuntime !== null &&
  afterRuntime !== null &&
  baselineRuntime > 0
    ? percentChange(
        baselineRuntime,
        afterRuntime
      )
    : null;

// ------------------------------------------------------
// Confidence / verdict
// ------------------------------------------------------

let confidence = "INSUFFICIENT DATA";
let verdict = "MORE DATA NEEDED";

if (
  afterResults.length >= 1 &&
  matchedBefore.length >= 1
) {
  confidence =
    afterResults.length >= 5
      ? "MODERATE"
      : afterResults.length >= 3
        ? "EARLY"
        : "VERY EARLY";

  if (
    runtimeChange !== null &&
    runtimeChange <= -5
  ) {
    verdict = "PROMISING";
  } else if (
    runtimeChange !== null &&
    runtimeChange >= 5
  ) {
    verdict = "NOT BENEFICIAL";
  } else {
    verdict = "INCONCLUSIVE";
  }
}

// ------------------------------------------------------
// Output
// ------------------------------------------------------

console.log("");
console.log(
  "========================================"
);
console.log(
  " HOME OPS COUNTERMEASURE EVALUATION"
);
console.log(
  "========================================"
);

console.log("");
console.log(countermeasure.name);
console.log(
  `Started: ${countermeasure.startDate}`
);

if (
  countermeasure.before &&
  countermeasure.after
) {
  console.log(
    `Change: ${countermeasure.before} → ${countermeasure.after}`
  );
}

console.log("");
console.log("AFTER");
console.log("----------------------------------------");
console.log(
  `Days evaluated     : ${afterResults.length}`
);
console.log(
  `Avg 4–7 runtime    : ${
    afterRuntime === null
      ? "--"
      : `${afterRuntime.toFixed(1)} min`
  }`
);
console.log(
  `Avg outside 4–7    : ${
    afterOutdoorAverage === null
      ? "--"
      : `${afterOutdoorAverage.toFixed(1)}°F`
  }`
);
console.log(
  `Avg 7 PM temp      : ${
    after7PMTemp === null
      ? "--"
      : `${after7PMTemp.toFixed(1)}°F`
  }`
);

console.log("");
console.log("WEATHER-MATCHED BASELINE");
console.log("----------------------------------------");
if (baselineCountermeasure) {
  console.log(
    `Baseline strategy   : ${baselineCountermeasure.name}`
  );
  console.log(
    `Baseline begins     : ${baselineCountermeasure.startDate}`
  );
}
console.log(
  `Days matched       : ${matchedBefore.length}`
);
console.log(
  `Temperature range  : ±${WEATHER_TOLERANCE}°F`
);
console.log(
  `Avg 4–7 runtime    : ${
    baselineRuntime === null
      ? "--"
      : `${baselineRuntime.toFixed(1)} min`
  }`
);

console.log("");
console.log("Matched days:");

for (const result of matchedBefore) {
  console.log(
    `  ${result.date}  ` +
    `${result.averageOutdoorTemp4to7?.toFixed(1)}°F  ` +
    `${result.onPeakRuntimeMinutes.toFixed(1)} min`
  );
}

console.log("");
console.log("EFFECT");
console.log("----------------------------------------");
console.log(
  `Peak runtime change: ${
    runtimeChange === null
      ? "--"
      : `${runtimeChange > 0 ? "+" : ""}${runtimeChange.toFixed(1)}%`
  }`
);

console.log("");
console.log("APS ELECTRICAL EFFECT");
console.log("----------------------------------------");

console.log(
  `After APS peak     : ${
    afterAPSPeak === null
      ? "--"
      : `${afterAPSPeak.toFixed(2)} kW`
  }`
);

console.log(
  `Baseline APS peak  : ${
    baselineAPSPeak === null
      ? "--"
      : `${baselineAPSPeak.toFixed(2)} kW`
  }`
);

console.log(
  `APS demand change  : ${
    apsDemandChange === null
      ? "--"
      : `${apsDemandChange > 0 ? "+" : ""}${apsDemandChange.toFixed(1)}%`
  }`
);

console.log("");
console.log("APS matched days:");

for (const result of matchedBefore) {
  const peak =
    getAPSPeak4to7(
      apsHistory,
      result.date
    );

  console.log(
    `  ${result.date}  ${
      peak === null
        ? "--"
        : `${peak.toFixed(2)} kW`
    }`
  );
}

console.log("");
console.log(
  `Confidence         : ${confidence}`
);
console.log(
  `Verdict            : ${verdict}`
);

console.log("");
console.log(
  "========================================"
);