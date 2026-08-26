import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const calendarPath = path.join(
      process.cwd(),
      "data/ops/calendar.json"
    );

    if (!fs.existsSync(calendarPath)) {
      return NextResponse.json({
        generatedAt: null,
        calendar: "Home Ops Calendar",
        eventCount: 0,
        events: [],
      });
    }

    const calendarData = JSON.parse(
      fs.readFileSync(calendarPath, "utf8")
    );

    return NextResponse.json(calendarData, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Calendar API failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Calendar data unavailable",
      },
      {
        status: 500,
      }
    );
  }
}
