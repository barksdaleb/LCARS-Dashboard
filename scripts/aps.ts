import fs from "fs";
import path from "path";
import os from "os";
import Papa from "papaparse";

// -----------------------------
// Find newest APS CSV
// -----------------------------
function findLatestAPSFile(): string {
  const downloads = path.join(os.homedir(), "Downloads");

  const apsFiles = fs
    .readdirSync(downloads)
    .filter(
      file =>
        file.startsWith("Hourly-usage-year") &&
        file.endsWith(".csv")
    )
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(downloads, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (!apsFiles.length) {
    throw new Error("No APS CSV found in Downloads.");
  }

  console.log(`Using: ${apsFiles[0].name}`);

  return path.join(downloads, apsFiles[0].name);
}

export async function updateAPS() {

  console.log("Connecting to APS...");

  const csvPath = findLatestAPSFile();

  // -----------------------------
  // Read CSV
  // -----------------------------
  const csv = fs.readFileSync(csvPath, "utf8");

  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    skipFirstNLines: 2
  });

  const records = parsed.data as any[];

  if (!records.length) {
    throw new Error("APS CSV contains no data.");
  }

  // -----------------------------
  // Calculate values
  // -----------------------------
  const dataDate = records[0]["Date"];

  const previousDate =
    records.find(r => r["Date"] !== dataDate)?.["Date"];

  const todayRows =
    records.filter(r => r["Date"] === dataDate);

  const yesterdayRows =
    records.filter(r => r["Date"] === previousDate);

  const todayUsage =
    todayRows.reduce(
      (sum, row) =>
        sum + Number(row["Usage (kWh)"]),
      0
    );

  const yesterdayUsage =
    yesterdayRows.reduce(
      (sum, row) =>
        sum + Number(row["Usage (kWh)"]),
      0
    );

  const currentDemand =
    Number(todayRows[0]["Demand (kW)"]);

  const lastReading =
    todayRows[0]["Time"];

  const dayPeakDemand =
    Math.max(
      ...todayRows.map(row =>
        Number(row["Demand (kW)"])
      )
    );

  const peakRow =
    todayRows.find(
      row => Number(row["Demand (kW)"]) === dayPeakDemand
    );

  const peakTime =
    peakRow?.["Time"] ?? "";

  // -----------------------------
  // APS On-Peak Demand
  // -----------------------------
  const onPeakRows = todayRows.filter(row => {
    const hour = Number(row["Time"].split(":")[0]);
    const isPM = row["Time"].includes("PM");

    const hour24 =
      isPM
        ? (hour === 12 ? 12 : hour + 12)
        : (hour === 12 ? 0 : hour);

    return hour24 >= 16 && hour24 < 19;
  });

  let onPeakDemand = 0;
  let onPeakTime = "";

  if (onPeakRows.length) {

    onPeakDemand = Math.max(
      ...onPeakRows.map(row =>
        Number(row["Demand (kW)"])
      )
    );

    const row = onPeakRows.find(
      r => Number(r["Demand (kW)"]) === onPeakDemand
    );

    onPeakTime = row?.["Time"] ?? "";

  }

  // -----------------------------
  // Update energy.json
  // -----------------------------
  const energy = JSON.parse(
    fs.readFileSync("data/energy.json", "utf8")
  );

  energy.energy.currentDemand =
    Number(currentDemand.toFixed(2));

  energy.energy.dayPeakDemand =
    Number(dayPeakDemand.toFixed(2));

  energy.energy.dayPeakTime =
    peakTime;

  energy.energy.dayPeakDemand =
    Number(onPeakDemand.toFixed(2));

  energy.energy.onPeakTime =
    onPeakTime;

  fs.writeFileSync(
    "data/energy.json",
    JSON.stringify(energy, null, 2)
  );

  console.log("");
  console.log("APS Data Date:      ", dataDate);
  console.log("Last Reading:       ", lastReading);
  console.log("Today's Usage:      ", todayUsage.toFixed(2), "kWh");
  console.log("Yesterday's Usage:  ", yesterdayUsage.toFixed(2), "kWh");
  console.log("Current Demand:     ", currentDemand.toFixed(2), "kW");
  console.log("Peak Demand:        ", dayPeakDemand.toFixed(2), "kW");
  console.log("Peak Time:          ", peakTime);
  console.log("");

  console.log("APS updated.");
}