import path from "path";

import {
  ThermalAnalyzer,
  ThermalAnalysis,
} from "../app/lib/ecobee/ThermalAnalyzer";

const requestedDate = process.argv[2];

const historyDir = path.join(
  process.cwd(),
  "data/history/ecobee"
);

const frontAnalyzer = new ThermalAnalyzer(
  path.join(historyDir, "front-ac.csv")
);

const hallAnalyzer = new ThermalAnalyzer(
  path.join(historyDir, "hall-ac.csv")
);

const frontDates = new Set(
  frontAnalyzer.getAvailableDates()
);

const hallDates = new Set(
  hallAnalyzer.getAvailableDates()
);

const todayPhoenix = new Intl.DateTimeFormat(
  "en-CA",
  {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
).format(new Date());

const latestCompleteDate = [...frontDates]
  .filter(
    (date) =>
      hallDates.has(date) &&
      date < todayPhoenix
  )
  .sort()
  .at(-1);

if (!latestCompleteDate && !requestedDate) {
  throw new Error(
    "No completed date exists in both Ecobee histories."
  );
}

const TARGET_DATE =
  requestedDate ?? latestCompleteDate!;

const front =
  frontAnalyzer.analyzeDate(TARGET_DATE);

const hall =
  hallAnalyzer.analyzeDate(TARGET_DATE);
  
function temp(value: number | null): string {
  return value === null
    ? "--"
    : `${value.toFixed(1)}°F`;
}

function change(value: number | null): string {
  if (value === null) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}°F`;
}

function printSystem(
  name: string,
  result: ThermalAnalysis
) {
  console.log("");
  console.log(name);
  console.log("----------------------------------------");

  console.log(
    `Total Cooling        : ${(result.totalRuntimeMinutes / 60).toFixed(2)} hrs`
  );

  console.log(
    `1–2 PM Runtime       : ${result.runtime1to2Minutes.toFixed(1)} min`
  );

  console.log(
    `2–4 PM Pre-Cool      : ${result.precoolRuntimeMinutes.toFixed(1)} min`
  );

  console.log(
    `Pre-Cool Duty Cycle  : ${result.precoolDutyCycle.toFixed(1)}%`
  );

  console.log(
    `4–7 PM On-Peak       : ${result.onPeakRuntimeMinutes.toFixed(1)} min`
  );

  console.log(
    `On-Peak Duty Cycle   : ${result.onPeakDutyCycle.toFixed(1)}%`
  );

  console.log("");

  console.log(
    `1 PM Temperature     : ${temp(result.temp1PM)}`
  );

  console.log(
    `2 PM Temperature     : ${temp(result.temp2PM)}`
  );

  console.log(
    `4 PM Temperature     : ${temp(result.temp4PM)}`
  );

  console.log(
    `7 PM Temperature     : ${temp(result.temp7PM)}`
  );

  console.log("");

  console.log(
    `2 PM Setpoint        : ${temp(result.setpoint2PM)}`
  );

  console.log(
    `4 PM Setpoint        : ${temp(result.setpoint4PM)}`
  );

  console.log(
    `7 PM Setpoint        : ${temp(result.setpoint7PM)}`
  );

  console.log("");

  console.log(
    `Pre-Cool Temp Change : ${change(result.precoolTempChange)}`
  );

  console.log(
    `4–7 Temp Change      : ${change(result.onPeakTempChange)}`
  );

  console.log("");

  console.log(
    `First Cooling 4–7    : ${result.firstCoolingAfter4PM ?? "--"}`
  );

  console.log(
    `Longest Peak Coast   : ${result.longestCoastMinutes.toFixed(0)} min`
  );

  console.log("");

  console.log(
    `Avg Outside 2–4      : ${temp(result.averageOutdoorTemp2to4)}`
  );

  console.log(
    `Avg Outside 4–7      : ${temp(result.averageOutdoorTemp4to7)}`
  );
}

console.log("");
console.log("========================================");
console.log("       BHEM THERMAL ANALYSIS");
console.log(`       ${TARGET_DATE}`);
console.log("========================================");

printSystem("FRONT AC", front);
printSystem("HALL AC", hall);

console.log("");
console.log("COMPARISON");
console.log("----------------------------------------");

const runtimeDifference =
  front.onPeakRuntimeMinutes -
  hall.onPeakRuntimeMinutes;

const dutyRatio =
  hall.onPeakDutyCycle > 0
    ? front.onPeakDutyCycle /
      hall.onPeakDutyCycle
    : null;

console.log(
  `Front vs Hall 4–7    : ${runtimeDifference.toFixed(1)} min`
);

console.log(
  `Front/Hall Duty Ratio: ${
    dutyRatio === null
      ? "--"
      : `${dutyRatio.toFixed(2)}x`
  }`
);

console.log("");

// ======================================================
// Weekday 4–7 PM Analysis
// BHEM Cool Down strategy began 2026-07-29
// ======================================================

const STRATEGY_START = "2026-07-29";

type WeekdayStats = {
  count: number;
  frontMinutes: number;
  hallMinutes: number;
};

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const weekdayStats = new Map<string, WeekdayStats>();

for (const day of weekdayNames) {
  weekdayStats.set(day, {
    count: 0,
    frontMinutes: 0,
    hallMinutes: 0,
  });
}

// Only use dates that exist in BOTH thermostat histories.

const commonDates = [...frontDates]
  .filter(
    (date) =>
      hallDates.has(date) &&
      date >= STRATEGY_START
  )
  .sort();

for (const date of commonDates) {
  // Determine weekday without allowing the computer's
  // timezone to shift the calendar date.
  const [year, month, day] =
    date.split("-").map(Number);

  const weekdayIndex =
    new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

  const weekday =
    weekdayNames[weekdayIndex];

  // APS on-peak is Monday-Friday only.
  if (
    weekday === "Saturday" ||
    weekday === "Sunday"
  ) {
    continue;
  }

  const frontDay =
    frontAnalyzer.analyzeDate(date);

  const hallDay =
    hallAnalyzer.analyzeDate(date);

  const stats = weekdayStats.get(weekday)!;

  stats.count++;

  stats.frontMinutes +=
    frontDay.onPeakRuntimeMinutes;

  stats.hallMinutes +=
    hallDay.onPeakRuntimeMinutes;
}

console.log("");
console.log("========================================");
console.log("   BHEM WEEKDAY 4–7 PM ANALYSIS");
console.log(`   SINCE COOL DOWN: ${STRATEGY_START}`);
console.log("========================================");
console.log("");

console.log(
  "DAY        DAYS    FRONT AVG    HALL AVG"
);
console.log(
  "----------------------------------------"
);

for (const weekday of [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
]) {
  const stats = weekdayStats.get(weekday)!;

  const frontAverage =
    stats.count > 0
      ? stats.frontMinutes / stats.count
      : 0;

  const hallAverage =
    stats.count > 0
      ? stats.hallMinutes / stats.count
      : 0;

  console.log(
    `${weekday.padEnd(11)}` +
    `${String(stats.count).padEnd(8)}` +
    `${frontAverage.toFixed(1).padStart(7)} min   ` +
    `${hallAverage.toFixed(1).padStart(7)} min`
  );
}

// ------------------------------------------------------
// Friday vs Monday-Thursday
// ------------------------------------------------------

const friday =
  weekdayStats.get("Friday")!;

let weekdayCount = 0;
let weekdayFrontMinutes = 0;
let weekdayHallMinutes = 0;

for (const weekday of [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
]) {
  const stats = weekdayStats.get(weekday)!;

  weekdayCount += stats.count;

  weekdayFrontMinutes +=
    stats.frontMinutes;

  weekdayHallMinutes +=
    stats.hallMinutes;
}

const fridayFrontAverage =
  friday.count > 0
    ? friday.frontMinutes / friday.count
    : null;

const fridayHallAverage =
  friday.count > 0
    ? friday.hallMinutes / friday.count
    : null;

const weekdayFrontAverage =
  weekdayCount > 0
    ? weekdayFrontMinutes / weekdayCount
    : null;

const weekdayHallAverage =
  weekdayCount > 0
    ? weekdayHallMinutes / weekdayCount
    : null;

function differenceText(
  fridayAverage: number | null,
  weekdayAverage: number | null
): string {
  if (
    fridayAverage === null ||
    weekdayAverage === null
  ) {
    return "--";
  }

  const difference =
    fridayAverage - weekdayAverage;

  const percent =
    weekdayAverage > 0
      ? (difference / weekdayAverage) * 100
      : 0;

  const minuteSign =
    difference > 0 ? "+" : "";

  const percentSign =
    percent > 0 ? "+" : "";

  return (
    `${minuteSign}${difference.toFixed(1)} min ` +
    `(${percentSign}${percent.toFixed(1)}%)`
  );
}

console.log("");
console.log("FRIDAY EFFECT");
console.log("----------------------------------------");

console.log(
  `Friday sample           : ${friday.count} day(s)`
);

console.log(
  `Mon–Thu sample          : ${weekdayCount} day(s)`
);

console.log("");

console.log(
  `Front Friday avg        : ${
    fridayFrontAverage === null
      ? "--"
      : `${fridayFrontAverage.toFixed(1)} min`
  }`
);

console.log(
  `Front Mon–Thu avg       : ${
    weekdayFrontAverage === null
      ? "--"
      : `${weekdayFrontAverage.toFixed(1)} min`
  }`
);

console.log(
  `Front Friday difference : ${differenceText(
    fridayFrontAverage,
    weekdayFrontAverage
  )}`
);

console.log("");

console.log(
  `Hall Friday avg         : ${
    fridayHallAverage === null
      ? "--"
      : `${fridayHallAverage.toFixed(1)} min`
  }`
);

console.log(
  `Hall Mon–Thu avg        : ${
    weekdayHallAverage === null
      ? "--"
      : `${weekdayHallAverage.toFixed(1)} min`
  }`
);

console.log(
  `Hall Friday difference  : ${differenceText(
    fridayHallAverage,
    weekdayHallAverage
  )}`
);

console.log("");

// ======================================================
// Front AC 4 PM Setpoint Performance
// ======================================================

type SetpointStats = {
  days: number;
  peakRuntimeMinutes: number;
  precoolRuntimeMinutes: number;
  temp4PMTotal: number;
  temp4PMCount: number;
  temp7PMTotal: number;
  temp7PMCount: number;
};

const setpointStats =
  new Map<number, SetpointStats>();

for (const date of commonDates) {
  const [year, month, day] =
    date.split("-").map(Number);

  const weekdayIndex =
    new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

  // APS peak only applies Monday-Friday.
  if (
    weekdayIndex === 0 ||
    weekdayIndex === 6
  ) {
    continue;
  }

  const result =
    frontAnalyzer.analyzeDate(date);

  if (result.setpoint4PM === null) {
    continue;
  }

  const setpoint =
    result.setpoint4PM;

  if (!setpointStats.has(setpoint)) {
    setpointStats.set(setpoint, {
      days: 0,
      peakRuntimeMinutes: 0,
      precoolRuntimeMinutes: 0,
      temp4PMTotal: 0,
      temp4PMCount: 0,
      temp7PMTotal: 0,
      temp7PMCount: 0,
    });
  }

  const stats =
    setpointStats.get(setpoint)!;

  stats.days++;

  stats.peakRuntimeMinutes +=
    result.onPeakRuntimeMinutes;

  stats.precoolRuntimeMinutes +=
    result.precoolRuntimeMinutes;

  if (result.temp4PM !== null) {
    stats.temp4PMTotal +=
      result.temp4PM;

    stats.temp4PMCount++;
  }

  if (result.temp7PM !== null) {
    stats.temp7PMTotal +=
      result.temp7PM;

    stats.temp7PMCount++;
  }
}

console.log("");
console.log("========================================");
console.log(" FRONT AC — 4 PM SETPOINT PERFORMANCE");
console.log(` SINCE COOL DOWN: ${STRATEGY_START}`);
console.log("========================================");
console.log("");

console.log(
  "SET     DAYS   2–4 AVG   4–7 AVG   DUTY    4PM     7PM"
);

console.log(
  "-------------------------------------------------------"
);

const sortedSetpoints =
  [...setpointStats.keys()].sort(
    (a, b) => a - b
  );

for (const setpoint of sortedSetpoints) {
  const stats =
    setpointStats.get(setpoint)!;

  const precoolAverage =
    stats.precoolRuntimeMinutes /
    stats.days;

  const peakAverage =
    stats.peakRuntimeMinutes /
    stats.days;

  const dutyCycle =
    (peakAverage / 180) * 100;

  const temp4Average =
    stats.temp4PMCount > 0
      ? stats.temp4PMTotal /
        stats.temp4PMCount
      : null;

  const temp7Average =
    stats.temp7PMCount > 0
      ? stats.temp7PMTotal /
        stats.temp7PMCount
      : null;

  console.log(
    `${`${setpoint.toFixed(1)}°F`.padEnd(8)}` +
    `${String(stats.days).padEnd(7)}` +
    `${precoolAverage.toFixed(1).padStart(6)}m   ` +
    `${peakAverage.toFixed(1).padStart(6)}m   ` +
    `${dutyCycle.toFixed(1).padStart(5)}%   ` +
    `${
      temp4Average === null
        ? "--"
        : temp4Average.toFixed(1)
    }°   ` +
    `${
      temp7Average === null
        ? "--"
        : temp7Average.toFixed(1)
    }°`
  );
}

console.log("");