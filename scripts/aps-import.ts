import fs from "fs";
import path from "path";
import Papa from "papaparse";

console.log("🚀 APS HISTORY IMPORTER RUNNING");

// ------------------------------------------------------
// Paths
// ------------------------------------------------------

const IMPORT_DIR = path.join(process.cwd(), "data/import/aps");
const HISTORY_DIR = path.join(process.cwd(), "data/history/aps");
const ARCHIVE_DIR = path.join(IMPORT_DIR, "archive");

const HOURLY_HISTORY_FILE = path.join(HISTORY_DIR, "hourly.csv");
const DAILY_HISTORY_FILE = path.join(HISTORY_DIR, "daily.csv");
const BILLING_HISTORY_FILE = path.join(HISTORY_DIR, "billing.csv");

fs.mkdirSync(IMPORT_DIR, { recursive: true });
fs.mkdirSync(HISTORY_DIR, { recursive: true });
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

// ------------------------------------------------------
// Types
// ------------------------------------------------------

type APSHourlyRecord = {
  timestamp: string;
  date: string;
  time: string;
  usageKWh: number;
  demandKW: number;
};

type APSDailyRecord = {
  date: string;

  onPeakKWh: number | null;
  estimatedOnPeakKWh: number | null;

  offPeakKWh: number | null;
  estimatedOffPeakKWh: number | null;

  superOffPeakKWh: number | null;
  estimatedSuperOffPeakKWh: number | null;

  demandKW: number | null;
  currentPeakDemandKW: number | null;

  totalKWh: number;
  averageTempF: number | null;
};

type APSBillingRecord = {
  month: string;

  cycleStartDate: string;
  cycleEndDate: string;

  onPeakKWh: number | null;
  offPeakKWh: number | null;
  superOffPeakKWh: number | null;

  peakDemandDate: string | null;

  energyCost: number | null;
  onPeakEnergyCost: number | null;
  offPeakEnergyCost: number | null;
  superOffPeakEnergyCost: number | null;

  basicServiceAndOtherCharges: number | null;
  adjustors: number | null;
  taxesAndFees: number | null;

  actualCost: number | null;
  totalEnergyCost: number | null;
  budgetBillingAmount: number | null;
};

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  if (text === "" || text.toLowerCase() === "nan") {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function nullableMoney(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value)
    .trim()
    .replace(/\$/g, "")
    .replace(/,/g, "");

  if (text === "" || text.toLowerCase() === "nan") {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

// ------------------------------------------------------
// Normalize APS Daily Date
//
// Example:
// Tue, Aug 13, 2024
// becomes:
// 2024-08-13
// ------------------------------------------------------

function normalizeDailyDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ------------------------------------------------------
// Normalize APS Billing Date
//
// Example:
// Thu, Jun 20, 2024
// becomes:
// 2024-06-20
// ------------------------------------------------------

function normalizeLongDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parts = value.split(",").map((part) => part.trim());

  if (parts.length < 3) {
    return null;
  }

  const dateText = `${parts[1]}, ${parts[2]}`;
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ------------------------------------------------------
// Normalize APS Hourly Timestamp
//
// Example:
// 08/13/2025 + 4:00 PM
// becomes:
// 2025-08-13T16:00
// ------------------------------------------------------

function normalizeHourlyTimestamp(
  date: string,
  time: string
): {
  timestamp: string;
  date: string;
  time: string;
} | null {
  const parts = date.split("/");

  if (parts.length !== 3) {
    return null;
  }

  const [month, day, year] = parts;

  const timeMatch = time
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!timeMatch) {
    return null;
  }

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2];
  const meridiem = timeMatch[3].toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  const normalizedDate =
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  const normalizedTime =
    `${String(hour).padStart(2, "0")}:${minute}`;

  return {
    timestamp: `${normalizedDate}T${normalizedTime}`,
    date: normalizedDate,
    time: normalizedTime,
  };
}

// ------------------------------------------------------
// Load Existing Hourly History
// ------------------------------------------------------

function loadHourlyHistory(): Map<string, APSHourlyRecord> {
  const history = new Map<string, APSHourlyRecord>();

  if (!fs.existsSync(HOURLY_HISTORY_FILE)) {
    return history;
  }

  const csv = fs.readFileSync(HOURLY_HISTORY_FILE, "utf8");

  const parsed = Papa.parse<APSHourlyRecord>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  for (const record of parsed.data) {
    if (record.timestamp) {
      history.set(record.timestamp, record);
    }
  }

  return history;
}

// ------------------------------------------------------
// Load Existing Daily History
// ------------------------------------------------------

function loadDailyHistory(): Map<string, APSDailyRecord> {
  const history = new Map<string, APSDailyRecord>();

  if (!fs.existsSync(DAILY_HISTORY_FILE)) {
    return history;
  }

  const csv = fs.readFileSync(DAILY_HISTORY_FILE, "utf8");

  const parsed = Papa.parse<APSDailyRecord>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  for (const record of parsed.data) {
    if (record.date) {
      history.set(record.date, record);
    }
  }

  return history;
}

// ------------------------------------------------------
// Load Existing Billing History
// ------------------------------------------------------

function loadBillingHistory(): Map<string, APSBillingRecord> {
  const history = new Map<string, APSBillingRecord>();

  if (!fs.existsSync(BILLING_HISTORY_FILE)) {
    return history;
  }

  const csv = fs.readFileSync(BILLING_HISTORY_FILE, "utf8");

  const parsed = Papa.parse<APSBillingRecord>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  for (const record of parsed.data) {
    if (record.cycleEndDate) {
      history.set(record.cycleEndDate, record);
    }
  }

  return history;
}

// ------------------------------------------------------
// Find APS Intake Files
// ------------------------------------------------------

const files = fs
  .readdirSync(IMPORT_DIR)
  .filter((file) => file.toLowerCase().endsWith(".csv"));

if (files.length === 0) {
  console.log("No APS CSV files found.");
  process.exit(0);
}

console.log(`Found ${files.length} APS CSV file(s).`);
console.log("");

// ------------------------------------------------------
// Load Existing History
// ------------------------------------------------------

const hourlyHistory = loadHourlyHistory();
const dailyHistory = loadDailyHistory();
const billingHistory = loadBillingHistory();

const existingHourlyCount = hourlyHistory.size;
const existingDailyCount = dailyHistory.size;
const existingBillingCount = billingHistory.size;

// ------------------------------------------------------
// Counters
// ------------------------------------------------------

let hourlyRows = 0;
let hourlyValid = 0;
let hourlySkipped = 0;

let dailyRows = 0;
let dailyValid = 0;
let dailySkipped = 0;

let billingRows = 0;
let billingValid = 0;
let billingSkipped = 0;

const processedFiles: string[] = [];

// ------------------------------------------------------
// Process Intake Files
// ------------------------------------------------------

for (const file of files) {
  console.log(`Processing: ${file}`);

  const source = path.join(IMPORT_DIR, file);
  const csv = fs.readFileSync(source, "utf8");

  const lines = csv.split(/\r?\n/);

  // APS CSV exports begin with:
  // sep=,
  //
  // Therefore the real header is normally line 2.

const headerLine =
  lines.find((line) =>
    line.includes("Date") ||
    line.includes("Bill Cycle Start Date")
  ) ?? "";

  // ----------------------------------------------------
  // APS HOURLY
  // ----------------------------------------------------

  if (
    headerLine.includes("Usage (kWh)") &&
    headerLine.includes("Demand (kW)") &&
    headerLine.includes("Time")
  ) {
    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      skipFirstNLines: 2,
    });

    console.log("  Type: APS Hourly");
    console.log(`  Rows found: ${parsed.data.length}`);

    hourlyRows += parsed.data.length;

    let imported = 0;
    let skipped = 0;

    for (const row of parsed.data) {
      const date = row["Date"]?.trim();
      const time = row["Time"]?.trim();

      const usageKWh = nullableNumber(row["Usage (kWh)"]);
      const demandKW = nullableNumber(row["Demand (kW)"]);

      if (
        !date ||
        !time ||
        usageKWh === null ||
        demandKW === null
      ) {
        skipped++;
        continue;
      }

      const normalized =
        normalizeHourlyTimestamp(date, time);

      if (!normalized) {
        skipped++;
        continue;
      }

      hourlyHistory.set(normalized.timestamp, {
        ...normalized,
        usageKWh,
        demandKW,
      });

      imported++;
    }

    hourlyValid += imported;
    hourlySkipped += skipped;

    console.log(`  Imported: ${imported}`);

    if (skipped > 0) {
      console.log(`  Skipped: ${skipped} invalid rows`);
    }

    processedFiles.push(file);

    console.log("");
    continue;
  }

  // ----------------------------------------------------
  // APS DAILY
  // ----------------------------------------------------

  if (
    headerLine.includes("Date") &&
    headerLine.includes("Total Energy (kWh)") &&
    headerLine.includes("Average Temperature") &&
    !headerLine.includes("Bill Cycle")
  ) {
    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      skipFirstNLines: 1,
    });

    console.log("  Type: APS Daily");
    console.log(`  Rows found: ${parsed.data.length}`);

    dailyRows += parsed.data.length;

    let imported = 0;
    let skipped = 0;

    for (const row of parsed.data) {
      const rawDate = row["Date"]?.trim();

      const totalKWh =
        nullableNumber(row["Total Energy (kWh)"]);

      if (!rawDate || totalKWh === null) {
        skipped++;
        continue;
      }

      const date = normalizeDailyDate(rawDate);

      if (!date) {
        skipped++;
        continue;
      }

      const record: APSDailyRecord = {
        date,

        onPeakKWh:
          nullableNumber(row["On-Peak Energy (kWh)"]),

        estimatedOnPeakKWh:
          nullableNumber(
            row["Estimated On-Peak Energy (kWh)"]
          ),

        offPeakKWh:
          nullableNumber(row["Off-Peak Energy (kWh)"]),

        estimatedOffPeakKWh:
          nullableNumber(
            row["Estimated Off-Peak Energy (kWh)"]
          ),

        superOffPeakKWh:
          nullableNumber(
            row["Super Off-Peak Energy (kWh)"]
          ),

        estimatedSuperOffPeakKWh:
          nullableNumber(
            row["Estimated Super Off-Peak Energy (kWh)"]
          ),

        demandKW:
          nullableNumber(row["Demand (kW)"]),

        currentPeakDemandKW:
          nullableNumber(row["Current Peak Demand (kW)"]),

        totalKWh,

        averageTempF:
          nullableNumber(row["Average Temperature"]),
      };

      // Date is the unique Daily key.
      // Overlapping APS exports overwrite the same date.

      dailyHistory.set(date, record);

      imported++;
    }

    dailyValid += imported;
    dailySkipped += skipped;

    console.log(`  Imported: ${imported}`);

    if (skipped > 0) {
      console.log(`  Skipped: ${skipped} invalid rows`);
    }

    processedFiles.push(file);

    console.log("");
    continue;
  }

  // ----------------------------------------------------
  // APS BILLING
  // ----------------------------------------------------

  if (
    headerLine.includes("Bill Cycle Start Date") &&
    headerLine.includes("Bill Cycle End Date") &&
    headerLine.includes("Actual Cost")
  ) {
    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      skipFirstNLines: 1,
    });

    console.log("  Type: APS Billing");
    console.log(`  Rows found: ${parsed.data.length}`);

    billingRows += parsed.data.length;

    let imported = 0;
    let skipped = 0;

    for (const row of parsed.data) {
      const cycleStartDate =
        normalizeLongDate(row["Bill Cycle Start Date"]);

      const cycleEndDate =
        normalizeLongDate(row["Bill Cycle End Date"]);

      if (!cycleStartDate || !cycleEndDate) {
        skipped++;
        continue;
      }

      const peakDemandDate =
        normalizeLongDate(row["Peak Demand Date"]);

      const record: APSBillingRecord = {
        month:
          row["Month"]?.trim() ?? "",

        cycleStartDate,
        cycleEndDate,

        onPeakKWh:
          nullableNumber(
            row["On-Peak Energy (kWh)"]
          ),

        offPeakKWh:
          nullableNumber(
            row["Off-Peak Energy (kWh)"]
          ),

        superOffPeakKWh:
          nullableNumber(
            row["Super Off-Peak Energy (kWh)"]
          ),

        peakDemandDate,

        energyCost:
          nullableMoney(row["Energy Cost"]),

        onPeakEnergyCost:
          nullableMoney(row["On-Peak Energy Cost"]),

        offPeakEnergyCost:
          nullableMoney(row["Off-Peak Energy Cost"]),

        superOffPeakEnergyCost:
          nullableMoney(
            row["Super Off-Peak Energy Cost"]
          ),

        basicServiceAndOtherCharges:
          nullableMoney(
            row["Basic Service and Other Charges"]
          ),

        adjustors:
          nullableMoney(row["Adjustors"]),

        taxesAndFees:
          nullableMoney(row["Taxes and Fees"]),

        actualCost:
          nullableMoney(row["Actual Cost"]),

        totalEnergyCost:
          nullableMoney(row["Total Energy Cost ($)"]),

        budgetBillingAmount:
          nullableMoney(row["Budget Billing Amount"]),
      };

      // Billing cycle end date is the unique key.
      // Re-importing the same billing history will
      // update rather than duplicate the cycle.

      billingHistory.set(cycleEndDate, record);

      imported++;
    }

    billingValid += imported;
    billingSkipped += skipped;

    console.log(`  Imported: ${imported}`);

    if (skipped > 0) {
      console.log(`  Skipped: ${skipped} invalid rows`);
    }

    processedFiles.push(file);

    console.log("");
    continue;
  }

  // ----------------------------------------------------
  // Unknown APS File
  // ----------------------------------------------------

  console.log("  ⚠ Unknown APS CSV type. Not archived.");
  console.log("");
}

// ------------------------------------------------------
// Write Hourly History
// ------------------------------------------------------

if (hourlyHistory.size > 0) {
  const records = Array.from(hourlyHistory.values()).sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp)
  );

  fs.writeFileSync(
    HOURLY_HISTORY_FILE,
    Papa.unparse(records) + "\n"
  );
}

// ------------------------------------------------------
// Write Daily History
// ------------------------------------------------------

if (dailyHistory.size > 0) {
  const records = Array.from(dailyHistory.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  fs.writeFileSync(
    DAILY_HISTORY_FILE,
    Papa.unparse(records) + "\n"
  );
}

// ------------------------------------------------------
// Write Billing History
// ------------------------------------------------------

if (billingHistory.size > 0) {
  const records = Array.from(billingHistory.values()).sort(
    (a, b) =>
      a.cycleEndDate.localeCompare(b.cycleEndDate)
  );

  fs.writeFileSync(
    BILLING_HISTORY_FILE,
    Papa.unparse(records) + "\n"
  );
}

// ------------------------------------------------------
// Summary
// ------------------------------------------------------

console.log("APS History");
console.log("----------------");

if (hourlyRows > 0) {
  console.log("Hourly");
  console.log(`  Rows found      : ${hourlyRows}`);
  console.log(`  Valid records   : ${hourlyValid}`);
  console.log(`  Skipped         : ${hourlySkipped}`);
  console.log(`  Existing history: ${existingHourlyCount}`);
  console.log(
    `  New records     : ${
      hourlyHistory.size - existingHourlyCount
    }`
  );
  console.log(`  Total history   : ${hourlyHistory.size}`);
  console.log("");
}

if (dailyRows > 0) {
  console.log("Daily");
  console.log(`  Rows found      : ${dailyRows}`);
  console.log(`  Valid records   : ${dailyValid}`);
  console.log(`  Skipped         : ${dailySkipped}`);
  console.log(`  Existing history: ${existingDailyCount}`);
  console.log(
    `  New records     : ${
      dailyHistory.size - existingDailyCount
    }`
  );
  console.log(`  Total history   : ${dailyHistory.size}`);
}

if (billingRows > 0) {
  if (dailyRows > 0) {
    console.log("");
  }

  console.log("Billing");
  console.log(`  Rows found      : ${billingRows}`);
  console.log(`  Valid records   : ${billingValid}`);
  console.log(`  Skipped         : ${billingSkipped}`);
  console.log(`  Existing history: ${existingBillingCount}`);
  console.log(
    `  New records     : ${
      billingHistory.size - existingBillingCount
    }`
  );
  console.log(`  Total history   : ${billingHistory.size}`);
}

// ------------------------------------------------------
// Archive Successfully Processed Files
// ------------------------------------------------------

if (processedFiles.length > 0) {
  console.log("");
  console.log("Archive");
  console.log("----------------");

  for (const file of processedFiles) {
    const source = path.join(IMPORT_DIR, file);

    if (!fs.existsSync(source)) {
      continue;
    }

    let destination = path.join(ARCHIVE_DIR, file);

    // Never overwrite an existing raw APS export.

    if (fs.existsSync(destination)) {
      const parsed = path.parse(file);

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      destination = path.join(
        ARCHIVE_DIR,
        `${parsed.name}-${timestamp}${parsed.ext}`
      );
    }

    fs.renameSync(source, destination);

    console.log(`✓ ${path.basename(destination)}`);
  }
}