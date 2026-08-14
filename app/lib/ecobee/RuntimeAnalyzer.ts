import fs from "fs";

export class RuntimeAnalyzer {

  constructor(private filename: string) {}

  analyze() {

    const csv = fs.readFileSync(this.filename, "utf8");

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    const header = lines.shift();

    if (!header) {
      throw new Error("History file is empty.");
    }

    let totalRuntime = 0;

    let totalRecords = 0;

    let peakRuntime = 0;

    const runtimePerDay = new Map<string, number>();

    for (const line of lines) {

      const values = line.split(",");

      const timestamp = new Date(values[0]);

      const runtime = Number(values[6]);

      totalRuntime += runtime;

      totalRecords++;

      const day = timestamp.toISOString().substring(0,10);

      runtimePerDay.set(
        day,
        (runtimePerDay.get(day) ?? 0) + runtime
      );

      const hour = timestamp.getHours();

      if (hour >= 16 && hour < 19) {
        peakRuntime += runtime;
      }

    }

    return {

      totalRecords,

      totalRuntimeSeconds: totalRuntime,

      totalRuntimeHours:
        totalRuntime / 3600,

      averageRuntimePerDay:

        totalRuntime /

        runtimePerDay.size /

        3600,

      peakRuntimeHours:

        peakRuntime /

        3600,

      days:

        runtimePerDay.size

    };

  }

}