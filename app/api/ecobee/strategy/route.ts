import { NextResponse } from "next/server";
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

    return NextResponse.json(result);
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