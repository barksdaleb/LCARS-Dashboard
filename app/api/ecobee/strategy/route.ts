import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { StrategyAnalyzer } from "../../../lib/energy/StrategyAnalyzer";

export async function GET() {
  try {
    const analyzer = new StrategyAnalyzer();

    const frontFile = path.join(
      process.cwd(),
      "data/history/ecobee/front-ac.csv"
    );

    const hallFile = path.join(
      process.cwd(),
      "data/history/ecobee/hall-ac.csv"
    );

    const result =
      analyzer.calculateWholeHouseVerdict(
        frontFile,
        hallFile
      );

const countermeasurePerformancePath = path.join(
  process.cwd(),
  "data/ops/countermeasure-performance.json"
);

const countermeasurePerformance =
  fs.existsSync(countermeasurePerformancePath)
    ? JSON.parse(
        fs.readFileSync(
          countermeasurePerformancePath,
          "utf8"
        )
      )
    : null;

return NextResponse.json({
  ...result,
  countermeasurePerformance,
});
  } catch (error) {
    console.error(
      "HVAC strategy analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "HVAC strategy analysis failed",
      },
      { status: 500 }
    );
  }
}