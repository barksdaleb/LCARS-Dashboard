import { WaterGuruClient } from "@/app/lib/waterguru/WaterGuruClient";

export async function GET() {
  try {
    const waterGuru = new WaterGuruClient();

    const dashboard = await waterGuru.getDashboard();

    const pool = dashboard.waterBodies[0];

    const measurements = Object.fromEntries(
      pool.measurements.map((m: any) => [m.type, m])
    );

    const chlorine = measurements.FREE_CL.floatValue;
    const ph = measurements.PH.floatValue;
    const alkalinity = measurements.TA.intValue;
    const calcium = measurements.CH.intValue;
    const cya = measurements.CYA.intValue;

    let status = "GREEN";
    let recommendation = "No action required.";

    if (ph > 7.8) {
      status = "RED";
      recommendation = "Lower pH";
    } else if (chlorine < 3) {
      status = "YELLOW";
      recommendation = "Increase Free Chlorine";
    } else if (alkalinity < 70 || alkalinity > 120) {
      status = "YELLOW";
      recommendation = "Adjust Total Alkalinity";
    }

    return Response.json({
      status,
      recommendation,

      temperature: pool.waterTemp,

      chlorine,

      ph,

      alkalinity,

      calcium,

      cya,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}