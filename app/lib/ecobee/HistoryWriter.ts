import fs from "fs";
import path from "path";
import { EcobeeRecord } from "./types";

export interface HistoryWriterResult {
  thermostats: number;
  records: number;
  filesWritten: string[];
}

export class HistoryWriter {
  private readonly OUTPUT_DIR = path.join(
    process.cwd(),
    "data/history/ecobee"
  );

  public write(records: EcobeeRecord[]): HistoryWriterResult {
    if (!records.length) {
      return {
        thermostats: 0,
        records: 0,
        filesWritten: [],
      };
    }

    fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });

    const groups = new Map<string, EcobeeRecord[]>();

    for (const record of records) {
      if (!groups.has(record.thermostat)) {
        groups.set(record.thermostat, []);
      }

      groups.get(record.thermostat)!.push(record);
    }

    const filesWritten: string[] = [];

    for (const [thermostat, rows] of groups) {
      const filename =
        thermostat
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") + ".csv";

      const filepath = path.join(this.OUTPUT_DIR, filename);

      const csv = [
        "timestamp,thermostat,indoorTemp,outdoorTemp,humidity,setpoint,coolRuntimeSeconds,fanRuntimeSeconds,hvacMode,program,event",

        ...rows.map(
          (r) =>
            [
              r.timestamp.toISOString(),
              r.thermostat,
              r.indoorTemp,
              r.outdoorTemp,
              r.humidity,
              r.setpoint,
              r.coolRuntimeSeconds,
              r.fanRuntimeSeconds,
              r.hvacMode,
              r.program,
              r.event ?? "",
            ].join(",")
        ),
      ].join("\n");

      fs.writeFileSync(filepath, csv);

      filesWritten.push(filename);
    }

    return {
      thermostats: groups.size,
      records: records.length,
      filesWritten,
    };
  }
}