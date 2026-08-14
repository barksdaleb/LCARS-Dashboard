import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function analyze(file: string) {
  const csv = fs.readFileSync(file, "utf8");

  const lines = csv.split(/\r?\n/).filter(Boolean);

  lines.shift(); // remove header

  let runtime = 0;
  let peak = 0;

  const days = new Set<string>();

  for (const line of lines) {
    const values = line.split(",");

    const timestamp = new Date(values[0]);

    const seconds = Number(values[6]);

    runtime += seconds;

    days.add(values[0].substring(0, 10));

    const hour = timestamp.getHours();

    if (hour >= 16 && hour < 19) {
      peak += seconds;
    }
  }

  return {
    runtimeHours: runtime / 3600,
    peakHours: peak / 3600,
    days: days.size,
  };
}

export async function GET() {
  const history = path.join(
    process.cwd(),
    "data/history/ecobee"
  );

  const hall = analyze(
    path.join(history, "hall-ac.csv")
  );

  const front = analyze(
    path.join(history, "front-ac.csv")
  );

  return NextResponse.json({
    hall,
    front,
  });
}