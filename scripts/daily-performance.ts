import fs from "fs";
import path from "path";
import Papa from "papaparse";

import {
  ThermalAnalyzer,
} from "../app/lib/ecobee/ThermalAnalyzer";

import {
  getCountermeasuresForDate,
} from "./ops-registry";

// ======================================================
// Paths
// ======================================================

const ROOT = process.cwd();

const HISTORY_DIR = path.join(
  ROOT,
  "data/history/ecobee"
);

const OUTPUT_DIR = path.join(
  ROOT,
  "data/ops"
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  "daily-performance.json"
);

const APS_HISTORY_PATH = path.join(
  ROOT,
  "data/history/aps/hourly.csv"
);

// ======================================================
// APS Types
// ======================================================

type APSHourlyRecord = {
  timestamp: string;
  date: string;
  time: string;
  usageKWh: number;
  demandKW: number;
};

// ======================================================
// APS Helpers
// ======================================================

function getAPSHourRecord(
  rows: APSHourlyRecord[],
  hour: number
): APSHourlyRecord | null {
  return (
    rows.find((row) => {
      const rowHour =
        Number(
          row.time.split(":")[0]
        );

      return rowHour === hour;
    }) ?? null
  );
}

function demandValue(
  row: APSHourlyRecord | null
): number | null {
  if (!row) {
    return null;
  }

  const value =
    Number(row.demandKW);

  return Number.isFinite(value)
    ? Number(value.toFixed(2))
    : null;
}

// ======================================================
// Thermal Analyzers
// ======================================================

const frontAnalyzer = new ThermalAnalyzer(
  path.join(
    HISTORY_DIR,
    "front-ac.csv"
  )
);

const hallAnalyzer = new ThermalAnalyzer(
  path.join(
    HISTORY_DIR,
    "hall-ac.csv"
  )
);

// ======================================================
// APS History
// ======================================================

if (!fs.existsSync(APS_HISTORY_PATH)) {
  throw new Error(
    `APS history not found: ${APS_HISTORY_PATH}`
  );
}

const apsCsv = fs.readFileSync(
  APS_HISTORY_PATH,
  "utf8"
);

const apsParsed =
  Papa.parse<APSHourlyRecord>(
    apsCsv,
    {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    }
  );

const apsRecords =
  apsParsed.data.filter(
    (record) =>
      record.date &&
      record.time &&
      Number.isFinite(
        record.usageKWh
      ) &&
      Number.isFinite(
        record.demandKW
      )
  );

// ======================================================
// Available Dates
// ======================================================

const frontDates = new Set(
  frontAnalyzer.getAvailableDates()
);

const hallDates = new Set(
  hallAnalyzer.getAvailableDates()
);

const todayPhoenix =
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Phoenix",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

// Only use completed dates that exist
// in BOTH Ecobee histories.

const apsDates = new Set(
  apsRecords.map(
    (record) => record.date
  )
);

const commonDates =
  [...frontDates]
    .filter(
      (date) =>
        hallDates.has(date) &&
        apsDates.has(date) &&
        date < todayPhoenix
    )
    .sort();

// ======================================================
// Build Daily Records
// ======================================================

const records =
  commonDates.map((date) => {
    const front =
      frontAnalyzer.analyzeDate(
        date
      );

    const hall =
      hallAnalyzer.analyzeDate(
        date
      );

    // --------------------------------------------------
    // APS DAILY PERFORMANCE
    // --------------------------------------------------

    const apsRows =
      apsRecords.filter(
        (record) =>
          record.date === date
      );

    const apsDailyUsage =
      apsRows.reduce(
        (sum, row) =>
          sum +
          Number(row.usageKWh),
        0
      );

    const apsDailyPeak =
      apsRows.length > 0
        ? Math.max(
            ...apsRows.map(
              (row) =>
                Number(
                  row.demandKW
                )
            )
          )
        : null;

    const apsDailyPeakRow =
      apsDailyPeak === null
        ? null
        : apsRows.find(
            (row) =>
              Number(
                row.demandKW
              ) ===
              apsDailyPeak
          ) ?? null;

    // Determine whether this is an
    // APS weekday demand day.

    const [year, month, day] =
      date
        .split("-")
        .map(Number);

    const weekday =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      ).getUTCDay();

    const isAPSOnPeakDay =
      weekday !== 0 &&
      weekday !== 6;

    // APS demand window
    // = 4 PM - 7 PM.

    const apsOnPeakRows =
      isAPSOnPeakDay
        ? apsRows.filter(
            (row) => {
              const hour =
                Number(
                  row.time
                    .split(":")[0]
                );

              return (
                hour >= 16 &&
                hour < 19
              );
            }
          )
        : [];

    const apsOnPeakDemand =
      apsOnPeakRows.length > 0
        ? Math.max(
            ...apsOnPeakRows.map(
              (row) =>
                Number(
                  row.demandKW
                )
            )
          )
        : null;

    const apsOnPeakRow =
      apsOnPeakDemand === null
        ? null
        : apsOnPeakRows.find(
            (row) =>
              Number(
                row.demandKW
              ) ===
              apsOnPeakDemand
          ) ?? null;

    // --------------------------------------------------
    // APS HOURLY PEAK PROFILE
    // --------------------------------------------------

    const aps4to5Row =
      getAPSHourRecord(
        apsRows,
        16
      );

    const aps5to6Row =
      getAPSHourRecord(
        apsRows,
        17
      );

    const aps6to7Row =
      getAPSHourRecord(
        apsRows,
        18
      );

    // --------------------------------------------------
    // HVAC OVERLAP
    // --------------------------------------------------

    const overlap4to5 =
      frontAnalyzer.overlapBetween(
        hallAnalyzer,
        date,
        16,
        17
      );

    const overlap5to6 =
      frontAnalyzer.overlapBetween(
        hallAnalyzer,
        date,
        17,
        18
      );

    const overlap6to7 =
      frontAnalyzer.overlapBetween(
        hallAnalyzer,
        date,
        18,
        19
      );

    // --------------------------------------------------
    // DAILY RECORD
    // --------------------------------------------------

    return {
      date,

      aps: {
        dailyUsageKWh:
          Number(
            apsDailyUsage.toFixed(
              2
            )
          ),

        dailyPeakDemandKW:
          apsDailyPeak === null
            ? null
            : Number(
                apsDailyPeak.toFixed(
                  2
                )
              ),

        dailyPeakTime:
          apsDailyPeakRow?.time ??
          null,

        onPeakDay:
          isAPSOnPeakDay,

        onPeakDemandKW:
          apsOnPeakDemand === null
            ? null
            : Number(
                apsOnPeakDemand.toFixed(
                  2
                )
              ),

        onPeakDemandTime:
          apsOnPeakRow?.time ??
          null,

        hourlyDemand: {
          demand4to5KW:
            demandValue(
              aps4to5Row
            ),

          demand5to6KW:
            demandValue(
              aps5to6Row
            ),

          demand6to7KW:
            demandValue(
              aps6to7Row
            ),
        },
      },

      hvacOverlap: {
        overlap4to5Minutes:
          overlap4to5,

        overlap5to6Minutes:
          overlap5to6,

        overlap6to7Minutes:
          overlap6to7,
      },

      countermeasures:
        getCountermeasuresForDate(
          date
        ).map(
          (item) => ({
            name: item.name,
            startDate:
              item.startDate,
            description:
              item.description,
          })
        ),

      front: {
        precoolRuntimeMinutes:
          front.precoolRuntimeMinutes,

        peakRuntimeMinutes:
          front.onPeakRuntimeMinutes,

        temp4PM:
          front.temp4PM,

        temp7PM:
          front.temp7PM,

        averageOutdoorTemp2to4:
          front.averageOutdoorTemp2to4,

        averageOutdoorTemp4to7:
          front.averageOutdoorTemp4to7,
      },

      hall: {
        precoolRuntimeMinutes:
          hall.precoolRuntimeMinutes,

        peakRuntimeMinutes:
          hall.onPeakRuntimeMinutes,

        temp4PM:
          hall.temp4PM,

        temp7PM:
          hall.temp7PM,
      },
    };
  });

// ======================================================
// Snapshot
// ======================================================

const snapshot = {
  generatedAt:
    new Date().toISOString(),

  records,
};

// ======================================================
// Write Output
// ======================================================

fs.mkdirSync(
  OUTPUT_DIR,
  {
    recursive: true,
  }
);

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(
    snapshot,
    null,
    2
  )
);

// ======================================================
// Console Summary
// ======================================================

console.log("");
console.log(
  "========================================"
);
console.log(
  "    HOME OPS DAILY PERFORMANCE"
);
console.log(
  "========================================"
);
console.log("");

console.log(
  `Daily records created: ${records.length}`
);

console.log(
  `First date: ${
    records[0]?.date ?? "--"
  }`
);

console.log(
  `Latest date: ${
    records.at(-1)?.date ?? "--"
  }`
);

console.log("");

console.log(
  `Snapshot written: ${OUTPUT_FILE}`
);

console.log("");
console.log(
  "========================================"
);