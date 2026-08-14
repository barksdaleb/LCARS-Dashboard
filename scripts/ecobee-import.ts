import fs from "fs";
import path from "path";

import { EcobeeRecord } from "../app/lib/ecobee/types";
import { HistoryWriter } from "../app/lib/ecobee/HistoryWriter";

console.log("🚀 NEW Ecobee IMPORTER RUNNING");

const IMPORT_DIR = path.join(process.cwd(), "data/import/ecobee");

const files = fs
  .readdirSync(IMPORT_DIR)
  .filter((file) => file.endsWith(".csv"));

if (files.length === 0) {
  console.log("No Ecobee CSV files found.");
  process.exit(0);
}

const file = files[0];

const csv = fs.readFileSync(path.join(IMPORT_DIR, file), "utf8");

const lines = csv.split(/\r?\n/);

// ------------------------------------------------------
// Locate Ecobee Header
// ------------------------------------------------------

const headerIndex = lines.findIndex((line) =>
  line.startsWith("Date,Time,System Setting")
);

if (headerIndex === -1) {
  console.error("Could not locate Ecobee data header.");
  process.exit(1);
}

// ------------------------------------------------------
// Thermostat Metadata
// ------------------------------------------------------

const thermostatLine = lines.find((line) =>
  line.startsWith("#,Thermostat,name")
);

const thermostat = thermostatLine?.split(",")[3] ?? "Unknown";

console.log(`Thermostat: ${thermostat}`);

// ------------------------------------------------------
// Data Rows
// ------------------------------------------------------

const rows = lines
  .slice(headerIndex + 1)
  .filter((line) => /^\d{4}-\d{2}-\d{2},/.test(line));

console.log(`Rows found: ${rows.length}`);

const records: EcobeeRecord[] = [];

let skipped = 0;

// ------------------------------------------------------
// Normalize
// ------------------------------------------------------

for (const row of rows) {
  const values = row.split(",");

  if (values.length < 15) {
    skipped++;
    continue;
  }

  const indoorTemp = Number(values[8]);
  const outdoorTemp = Number(values[10]);
  const humidity = Number(values[9]);
  const setpoint = Number(values[6]);

  // Reject incomplete Ecobee rows
  if (
    Number.isNaN(indoorTemp) ||
    Number.isNaN(outdoorTemp) ||
    Number.isNaN(humidity) ||
    Number.isNaN(setpoint)
  ) {
    skipped++;
    continue;
  }

  // Reject placeholder rows at the end of the export
  if (
    indoorTemp === 0 &&
    humidity === 0 &&
    setpoint === 0
  ) {
    skipped++;
    continue;
  }

  records.push({
    timestamp: new Date(`${values[0]}T${values[1]}`),

    thermostat,

    indoorTemp,
    outdoorTemp,
    humidity,
    setpoint,

    coolRuntimeSeconds: Number(values[12]),
    fanRuntimeSeconds: Number(values[14]),

    hvacMode: values[3],
    program: values[5],
    event: values[4] || null,
  });
}

// ------------------------------------------------------
// Results
// ------------------------------------------------------

console.log(`Imported ${records.length} records`);

if (skipped > 0) {
  console.log(`Skipped ${skipped} invalid rows`);
}

// ------------------------------------------------------
// Write History
// ------------------------------------------------------

const writer = new HistoryWriter();

const result = writer.write(records);

console.log("");

console.log("History Writer");
console.log("----------------");
console.log(`Thermostats : ${result.thermostats}`);
console.log(`Records     : ${result.records}`);

console.log("");

for (const file of result.filesWritten) {
  console.log(`✓ ${file}`);
}