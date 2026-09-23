import { NextResponse } from "next/server";

import { analyzeTeslaCharging } from "@/app/lib/tesla/ChargingAnalyzer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const analysis = analyzeTeslaCharging();

    return NextResponse.json(analysis);
  } catch (error) {
    console.error(
      "Tesla charging analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Tesla charging analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}