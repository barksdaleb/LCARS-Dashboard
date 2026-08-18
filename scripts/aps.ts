import fs from "fs";
import path from "path";
import Papa from "papaparse";


function formatAPSClock(time: string): string {
  const [hourText, minuteText = "00"] = time.trim().split(":");

  const hour24 = Number(hourText);

  if (!Number.isFinite(hour24)) {
    return time;
  }

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minuteText} ${period}`;
}


type APSHourlyRecord = {
  timestamp: string;
  date: string;
  time: string;
  usageKWh: number;
  demandKW: number;
};

export async function updateAPS() {
  console.log("Reading APS history...");
  const requestedDate = process.argv[2];

  const historyFile = path.join(
    process.cwd(),
    "data/history/aps/hourly.csv"
  );

  if (!fs.existsSync(historyFile)) {
    throw new Error(
      "APS hourly history not found. Run npm run aps-import first."
    );
  }

  const csv = fs.readFileSync(historyFile, "utf8");

  const parsed = Papa.parse<APSHourlyRecord>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const records = parsed.data.filter(
    (record) =>
      record.timestamp &&
      record.date &&
      record.time &&
      Number.isFinite(record.usageKWh) &&
      Number.isFinite(record.demandKW)
  );

  if (!records.length) {
    throw new Error("APS hourly history contains no valid data.");
  }

  // History is stored oldest -> newest.
  records.sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  // -----------------------------
  // Determine newest two dates
  // -----------------------------

  const dates = [...new Set(records.map((r) => r.date))].sort();

  const dataDate =
  requestedDate ?? dates[dates.length - 1];

if (!dates.includes(dataDate)) {
  throw new Error(
    `APS history does not contain ${dataDate}.`
  );
}

  // APS demand on-peak applies Monday-Friday only.
// Use UTC construction so the calendar date cannot
// shift based on the computer's timezone.
const [year, month, day] =
  dataDate.split("-").map(Number);

const weekdayIndex = new Date(
  Date.UTC(year, month - 1, day)
).getUTCDay();

const isWeekend =
  weekdayIndex === 0 ||
  weekdayIndex === 6;

const isAPSOnPeakDay = !isWeekend;

  const dataDateIndex = dates.indexOf(dataDate);

const previousDate =
  dataDateIndex > 0
    ? dates[dataDateIndex - 1]
    : null;
    
  const todayRows = records.filter(
    (r) => r.date === dataDate
  );

  const yesterdayRows = previousDate
    ? records.filter((r) => r.date === previousDate)
    : [];

  if (!todayRows.length) {
    throw new Error(
      `No APS hourly records found for ${dataDate}.`
    );
  }

  // -----------------------------
  // Calculate usage
  // -----------------------------

  const todayUsage = todayRows.reduce(
    (sum, row) => sum + Number(row.usageKWh),
    0
  );

  const yesterdayUsage = yesterdayRows.reduce(
    (sum, row) => sum + Number(row.usageKWh),
    0
  );

  // Newest hourly reading
  const latestRow = todayRows[todayRows.length - 1];

  const currentDemand = Number(latestRow.demandKW);
  const hour24 = Number(latestRow.time.split(":")[0]);

const lastReading = new Date(
  2000,
  0,
  1,
  hour24
).toLocaleTimeString("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

  // -----------------------------
  // Daily Peak
  // -----------------------------

  const dayPeakDemand = Math.max(
    ...todayRows.map((row) => Number(row.demandKW))
  );

  const peakRow = todayRows.find(
    (row) => Number(row.demandKW) === dayPeakDemand
  );

  const peakTime = peakRow
  ? formatAPSClock(peakRow.time)
  : "";


  // -----------------------------
  // APS On-Peak: 4 PM - 7 PM
  // -----------------------------

  const onPeakRows = isAPSOnPeakDay
  ? todayRows.filter((row) => {
      const hour = Number(
        row.time.split(":")[0]
      );

      return hour >= 16 && hour < 19;
    })
  : [];

  let onPeakDemand = 0;
  let onPeakTime = "";

  if (onPeakRows.length) {
    onPeakDemand = Math.max(
      ...onPeakRows.map((row) => Number(row.demandKW))
    );

    const row = onPeakRows.find(
      (r) => Number(r.demandKW) === onPeakDemand
    );

   onPeakTime = row
  ? formatAPSClock(row.time)
  : "";
  }

  // -----------------------------
  // Update energy.json
  // -----------------------------

  const energyPath = path.join(
    process.cwd(),
    "data/energy.json"
  );

  const energy = JSON.parse(
    fs.readFileSync(energyPath, "utf8")
  );

  energy.energy.dataDate = dataDate;
  energy.energy.lastReading = lastReading;

  energy.energy.today =
    Number(todayUsage.toFixed(2));

  energy.energy.yesterday =
    Number(yesterdayUsage.toFixed(2));

  energy.energy.currentDemand =
    Number(currentDemand.toFixed(2));

  energy.energy.dayPeakDemand =
    Number(dayPeakDemand.toFixed(2));

  energy.energy.dayPeakTime =
    peakTime;

  energy.energy.onPeakDemand =
    Number(onPeakDemand.toFixed(2));

  energy.energy.onPeakTime =
    onPeakTime;

  fs.writeFileSync(
    energyPath,
    JSON.stringify(energy, null, 2)
  );

  console.log("");
  console.log("APS Data Date:      ", dataDate);
  console.log("Last Reading:       ", lastReading);
  console.log(
    "Today's Usage:      ",
    todayUsage.toFixed(2),
    "kWh"
  );
  console.log(
    "Yesterday's Usage:  ",
    yesterdayUsage.toFixed(2),
    "kWh"
  );
  console.log(
    "Current Demand:     ",
    currentDemand.toFixed(2),
    "kW"
  );
  console.log(
    "Daily Peak Demand:  ",
    dayPeakDemand.toFixed(2),
    "kW"
  );
  console.log("Daily Peak Time:    ", peakTime);
  if (isAPSOnPeakDay) {
  console.log(
    "4-7 Peak Demand:    ",
    onPeakDemand.toFixed(2),
    "kW"
  );
  console.log(
    "4-7 Peak Time:      ",
    onPeakTime
  );
} else {
  console.log(
    "APS Demand Window:  OFF-PEAK ALL DAY"
  );
  console.log(
    "Billing Demand Risk: NONE"
  );
}
  console.log("");

  console.log("APS updated from history.");
}