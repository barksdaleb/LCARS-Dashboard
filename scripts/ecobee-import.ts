import fs from "fs";
import path from "path";

import { EcobeeRecord } from "../app/lib/ecobee/types";
import { HistoryWriter } from "../app/lib/ecobee/HistoryWriter";

console.log("🚀 NEW Ecobee IMPORTER RUNNING");

const IMPORT_DIR = path.join(process.cwd(), "data/import/ecobee");

const ARCHIVE_DIR = path.join(IMPORT_DIR, "archive");

if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

const files = fs
  .readdirSync(IMPORT_DIR)
  .filter((file) => file.toLowerCase().endsWith(".csv"));

if (files.length === 0) {
  console.log("No Ecobee CSV files found.");
  process.exit(0);
}

console.log(`Found ${files.length} Ecobee CSV file(s).`);
console.log("");

const allRecords: EcobeeRecord[] = [];

let totalRows = 0;
let totalSkipped = 0;

// ------------------------------------------------------
// Process every Ecobee CSV
// ------------------------------------------------------

for (const file of files) {
  console.log(`Processing: ${file}`);

  const csv = fs.readFileSync(path.join(IMPORT_DIR, file), "utf8");
  const lines = csv.split(/\r?\n/);

  // ------------------------------------------------------
  // Locate Ecobee Header
  // ------------------------------------------------------

  const headerIndex = lines.findIndex((line) =>
    line.startsWith("Date,Time,System Setting")
  );

  if (headerIndex === -1) {
    console.log("  ⚠ Could not locate Ecobee data header. Skipping file.");
    console.log("");
    continue;
  }

  // ------------------------------------------------------
  // Thermostat Metadata
  // ------------------------------------------------------

  const thermostatLine = lines.find((line) =>
    line.startsWith("#,Thermostat,name")
  );

  const thermostat = thermostatLine?.split(",")[3] ?? "Unknown";

  console.log(`  Thermostat: ${thermostat}`);


    // ------------------------------------------------------
  // Column Mapping
  // Front and Hall Ecobee exports can have different
  // column positions, so locate fields by header name.
  // ------------------------------------------------------

  const headers = lines[headerIndex].split(",");

  const outdoorTempIndex =
    headers.indexOf("Outdoor Temp (F)");

  const coolRuntimeIndex =
    headers.indexOf("Cool Stage 1 (sec)");

  const fanRuntimeIndex =
    headers.indexOf("Fan (sec)");

  if (
    outdoorTempIndex === -1 ||
    coolRuntimeIndex === -1 ||
    fanRuntimeIndex === -1
  ) {
    console.log(
      "  ⚠ Required Ecobee columns not found. Skipping file."
    );
    console.log("");
    continue;
  }

  console.log(
    `  Columns: outdoor=${outdoorTempIndex}, cooling=${coolRuntimeIndex}, fan=${fanRuntimeIndex}`
  );

  // ------------------------------------------------------
  // Data Rows
  // ------------------------------------------------------

  const rows = lines
    .slice(headerIndex + 1)
    .filter((line) => /^\d{4}-\d{2}-\d{2},/.test(line));

  console.log(`  Rows found: ${rows.length}`);

  totalRows += rows.length;

  let imported = 0;
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
    const outdoorTemp = Number(values[outdoorTempIndex]);
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

    allRecords.push({
      timestamp: new Date(`${values[0]}T${values[1]}`),

      thermostat,

      indoorTemp,
      outdoorTemp,
      humidity,
      setpoint,

coolRuntimeSeconds: Number(values[coolRuntimeIndex]),
fanRuntimeSeconds: Number(values[fanRuntimeIndex]),

      hvacMode: values[3],
      program: values[5],
      event: values[4] || null,
    });

    imported++;
  }

  totalSkipped += skipped;

  console.log(`  Imported: ${imported}`);

  if (skipped > 0) {
    console.log(`  Skipped: ${skipped} invalid rows`);
  }

  console.log("");
}

// ------------------------------------------------------
// Results
// ------------------------------------------------------

console.log("Import Summary");
console.log("----------------");
console.log(`Files       : ${files.length}`);
console.log(`Rows found  : ${totalRows}`);
console.log(`Imported    : ${allRecords.length}`);
console.log(`Skipped     : ${totalSkipped}`);

if (allRecords.length === 0) {
  console.log("");
  console.log("No valid Ecobee records found.");
  process.exit(0);
}

// ------------------------------------------------------
// Write History
// ------------------------------------------------------

const writer = new HistoryWriter();

const result = writer.write(allRecords);

console.log("");
console.log("History Writer");
console.log("----------------");
console.log(`Thermostats : ${result.thermostats}`);
console.log(`Records     : ${result.records}`);

console.log("");

for (const file of result.filesWritten) {
  console.log(`✓ ${file}`);
}


// ------------------------------------------------------
// Archive Successfully Processed Files
// ------------------------------------------------------

console.log("");
console.log("Archive");
console.log("----------------");

for (const file of files) {
  const source = path.join(IMPORT_DIR, file);

  if (!fs.existsSync(source)) {
    continue;
  }

  let destination = path.join(ARCHIVE_DIR, file);

  // Prevent overwriting an existing archived export
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



