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

  private loadExisting(
    filepath: string
  ): Map<string, string> {
    const records = new Map<string, string>();

    if (!fs.existsSync(filepath)) {
      return records;
    }

    const csv = fs.readFileSync(filepath, "utf8");

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    lines.shift(); // header

    for (const line of lines) {
      const values = line.split(",");

      const timestamp = values[0];

      if (!timestamp) {
        continue;
      }

      records.set(timestamp, line);
    }

    return records;
  }

  public write(
    records: EcobeeRecord[]
  ): HistoryWriterResult {
    if (!records.length) {
      return {
        thermostats: 0,
        records: 0,
        filesWritten: [],
      };
    }

    fs.mkdirSync(
      this.OUTPUT_DIR,
      { recursive: true }
    );

    const groups =
      new Map<string, EcobeeRecord[]>();

    for (const record of records) {
      if (!groups.has(record.thermostat)) {
        groups.set(record.thermostat, []);
      }

      groups
        .get(record.thermostat)!
        .push(record);
    }

    const filesWritten: string[] = [];

    for (const [thermostat, rows] of groups) {
      const filename =
        thermostat
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") +
        ".csv";

      const filepath = path.join(
        this.OUTPUT_DIR,
        filename
      );

      // Existing normalized history.
      const merged =
        this.loadExisting(filepath);

      // Add/replace records from this import.
      //
      // Using Map.set() means the NEW import wins
      // when the same timestamp already exists.
      for (const r of rows) {
        const timestamp =
          r.timestamp.toISOString();

        const line = [
          timestamp,
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
        ].join(",");

        merged.set(timestamp, line);
      }

      // Sort all history chronologically.
      const sorted = [...merged.entries()]
        .sort(
          ([timestampA], [timestampB]) =>
            new Date(timestampA).getTime() -
            new Date(timestampB).getTime()
        )
        .map(([, line]) => line);

      const header =
        "timestamp,thermostat,indoorTemp,outdoorTemp,humidity,setpoint,coolRuntimeSeconds,fanRuntimeSeconds,hvacMode,program,event";

      const csv = [
        header,
        ...sorted,
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