import { WaterGuruClient } from "@/app/lib/waterguru/WaterGuruClient";

export async function GET() {
  try {
    const waterGuru = new WaterGuruClient();
    const dashboard = await waterGuru.getDashboard();

    const pool = dashboard.waterBodies[0];

    const measurements = Object.fromEntries(
      pool.measurements.map((m: any) => [m.type, m])
    );

    return Response.json({
      status: dashboard.status,
      temperature: pool.waterTemp,
      chlorine: measurements.FREE_CL.floatValue,
      ph: measurements.PH.floatValue,
      alkalinity: measurements.TA.intValue,
      calcium: measurements.CH.intValue,
      cya: measurements.CYA.intValue,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}