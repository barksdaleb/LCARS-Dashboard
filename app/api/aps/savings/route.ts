import { NextResponse } from "next/server";
import path from "path";

import {
  SavingsAnalyzer,
} from "@/app/lib/energy/SavingsAnalyzer";

export async function GET() {
  try {
    const filename = path.join(
      process.cwd(),
      "data/history/aps/daily.csv"
    );

    const analyzer =
      new SavingsAnalyzer(filename);

    const result = analyzer.comparePlans(
      "2026-07-22",
      "2026-08-15"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "APS savings analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "APS savings analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}