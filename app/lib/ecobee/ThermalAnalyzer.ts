import fs from "fs";

export type ThermalRecord = {
  timestamp: Date;
  localDate: string;
  localHour: number;
  localMinute: number;

  indoorTemp: number;
  outdoorTemp: number;
  humidity: number;
  setpoint: number;

  coolRuntimeSeconds: number;

  hvacMode: string;
  program: string;
};

export type ThermalAnalysis = {
  date: string;
  thermostat: string;

  firstReading: string | null;
  lastReading: string | null;

  totalRuntimeMinutes: number;

runtime1to2Minutes: number;
sleepRuntimeMinutes: number;
precoolRuntimeMinutes: number;
onPeakRuntimeMinutes: number;

  runtime4to5Minutes: number;
  runtime5to6Minutes: number;
  runtime6to7Minutes: number;

  precoolDutyCycle: number;
  onPeakDutyCycle: number;

  temp1PM: number | null;
  temp2PM: number | null;
  temp4PM: number | null;
  temp7PM: number | null;

  setpoint2PM: number | null;
  setpoint4PM: number | null;
  setpoint7PM: number | null;

  precoolTempChange: number | null;
  onPeakTempChange: number | null;

  firstCoolingAfter4PM: string | null;
  longestCoastMinutes: number;

  averageOutdoorTemp2to4: number | null;
  averageOutdoorTemp4to7: number | null;
};

export class ThermalAnalyzer {
  private cachedRecords: ThermalRecord[] | null =
    null;

  private cachedThermostat: string | null =
    null;

  constructor(private filename: string) {}

  private getPhoenixParts(timestamp: Date) {
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "America/Phoenix",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }
      );

    const parts =
      formatter.formatToParts(timestamp);

    const get = (type: string) =>
      parts.find(
        (part) => part.type === type
      )?.value;

    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = get("hour");
    const minute = get("minute");

    if (
      !year ||
      !month ||
      !day ||
      hour === undefined ||
      minute === undefined
    ) {
      return null;
    }

    return {
      date: `${year}-${month}-${day}`,
      hour: Number(hour),
      minute: Number(minute),
    };
  }

  private formatPhoenixTime(
    timestamp: Date
  ): string {
    return timestamp.toLocaleTimeString(
      "en-US",
      {
        timeZone: "America/Phoenix",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  public overlapBetween(
    other: ThermalAnalyzer,
    date: string,
    startHour: number,
    endHour: number
  ): number {
    const firstRecords = this
      .loadRecords()
      .filter(
        (record) =>
          record.localDate === date &&
          record.localHour >= startHour &&
          record.localHour < endHour
      );

    const secondRecords = other
      .loadRecords()
      .filter(
        (record) =>
          record.localDate === date &&
          record.localHour >= startHour &&
          record.localHour < endHour
      );

    const secondByTimestamp = new Map(
      secondRecords.map((record) => [
        record.timestamp.getTime(),
        record,
      ])
    );

    let overlapSeconds = 0;

    for (const first of firstRecords) {
      const second =
        secondByTimestamp.get(
          first.timestamp.getTime()
        );

      if (!second) {
        continue;
      }

      overlapSeconds += Math.min(
        first.coolRuntimeSeconds,
        second.coolRuntimeSeconds
      );
    }

    return overlapSeconds / 60;
  }

  public loadRecords(): ThermalRecord[] {
    if (this.cachedRecords !== null) {
      return this.cachedRecords;
    }

    const csv = fs.readFileSync(
      this.filename,
      "utf8"
    );

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    lines.shift();

    const records: ThermalRecord[] = [];

    for (const line of lines) {
      const values = line.split(",");

      const timestamp =
        new Date(values[0]);

      if (
        Number.isNaN(
          timestamp.getTime()
        )
      ) {
        continue;
      }

      const phoenix =
        this.getPhoenixParts(timestamp);

      if (!phoenix) {
        continue;
      }

      const indoorTemp =
        Number(values[2]);

      const outdoorTemp =
        Number(values[3]);

      const humidity =
        Number(values[4]);

      const setpoint =
        Number(values[5]);

      const coolRuntimeSeconds =
        Number(values[6]);

      if (
        !Number.isFinite(indoorTemp) ||
        !Number.isFinite(
          coolRuntimeSeconds
        )
      ) {
        continue;
      }

      records.push({
        timestamp,
        localDate: phoenix.date,
        localHour: phoenix.hour,
        localMinute: phoenix.minute,

        indoorTemp,
        outdoorTemp,
        humidity,
        setpoint,
        coolRuntimeSeconds,

        hvacMode: values[8] ?? "",
        program: values[9] ?? "",
      });
    }

    records.sort(
      (a, b) =>
        a.timestamp.getTime() -
        b.timestamp.getTime()
    );

    this.cachedRecords = records;

    return this.cachedRecords;
  }

  private getThermostatName(): string {
    if (this.cachedThermostat !== null) {
      return this.cachedThermostat;
    }

    const csv = fs.readFileSync(
      this.filename,
      "utf8"
    );

    this.cachedThermostat =
      csv
        .split(/\r?\n/)[1]
        ?.split(",")[1] ??
      "Unknown";

    return this.cachedThermostat;
  }

  private getClosestRecord(
    records: ThermalRecord[],
    hour: number
  ): ThermalRecord | null {
    const targetMinutes =
      hour * 60;

    let closest:
      | ThermalRecord
      | null = null;

    let closestDifference =
      Infinity;

    for (const record of records) {
      const recordMinutes =
        record.localHour * 60 +
        record.localMinute;

      const difference =
        Math.abs(
          recordMinutes -
            targetMinutes
        );

      if (
        difference <
        closestDifference
      ) {
        closestDifference =
          difference;

        closest = record;
      }
    }

    // Don't use a reading more than
    // 10 minutes away from the
    // requested clock time.
    if (closestDifference > 10) {
      return null;
    }

    return closest;
  }

  private runtimeBetween(
    records: ThermalRecord[],
    startHour: number,
    endHour: number
  ): number {
    return records
      .filter(
        (record) =>
          record.localHour >=
            startHour &&
          record.localHour <
            endHour
      )
      .reduce(
        (sum, record) =>
          sum +
          record.coolRuntimeSeconds,
        0
      );
  }

  private averageOutdoorTemp(
    records: ThermalRecord[],
    startHour: number,
    endHour: number
  ): number | null {
    const temperatures =
      records
        .filter(
          (record) =>
            record.localHour >=
              startHour &&
            record.localHour <
              endHour &&
            Number.isFinite(
              record.outdoorTemp
            ) &&
            record.outdoorTemp > 0
        )
        .map(
          (record) =>
            record.outdoorTemp
        );

    if (!temperatures.length) {
      return null;
    }

    return (
      temperatures.reduce(
        (sum, temp) =>
          sum + temp,
        0
      ) / temperatures.length
    );
  }

  private findFirstCoolingAfter4(
    records: ThermalRecord[]
  ): string | null {
    const record =
      records.find(
        (record) =>
          record.localHour >= 16 &&
          record.localHour < 19 &&
          record.coolRuntimeSeconds > 0
      );

    return record
      ? this.formatPhoenixTime(
          record.timestamp
        )
      : null;
  }

  private longestCoastDuringPeak(
    records: ThermalRecord[]
  ): number {
    const peakRecords =
      records.filter(
        (record) =>
          record.localHour >= 16 &&
          record.localHour < 19
      );

    let longestSeconds = 0;
    let currentSeconds = 0;

    for (const record of peakRecords) {
      // Each normalized Ecobee row
      // represents a five-minute
      // reporting interval.
      const intervalSeconds = 300;

      if (
        record.coolRuntimeSeconds === 0
      ) {
        currentSeconds +=
          intervalSeconds;

        longestSeconds = Math.max(
          longestSeconds,
          currentSeconds
        );
      } else {
        currentSeconds = 0;
      }
    }

    return longestSeconds / 60;
  }

  public analyzeDate(
    targetDate: string
  ): ThermalAnalysis {
    const allRecords =
      this.loadRecords();

    const records =
      allRecords.filter(
        (record) =>
          record.localDate ===
          targetDate
      );

    if (!records.length) {
      throw new Error(
        `No Ecobee records found for ${targetDate}.`
      );
    }

    const thermostat =
      this.getThermostatName();

    const totalRuntimeSeconds =
      records.reduce(
        (sum, record) =>
          sum +
          record.coolRuntimeSeconds,
        0
      );
const sleepRuntimeSeconds =
  records
    .filter(
      (record) =>
        record.program === "Sleep"
    )
    .reduce(
      (sum, record) =>
        sum +
        record.coolRuntimeSeconds,
      0
    );
    const runtime1to2Seconds =
      this.runtimeBetween(
        records,
        13,
        14
      );

    const precoolSeconds =
      this.runtimeBetween(
        records,
        14,
        16
      );

    const onPeakSeconds =
      this.runtimeBetween(
        records,
        16,
        19
      );

    const runtime4to5Seconds =
      this.runtimeBetween(
        records,
        16,
        17
      );

    const runtime5to6Seconds =
      this.runtimeBetween(
        records,
        17,
        18
      );

    const runtime6to7Seconds =
      this.runtimeBetween(
        records,
        18,
        19
      );

    const record1PM =
      this.getClosestRecord(
        records,
        13
      );

    const record2PM =
      this.getClosestRecord(
        records,
        14
      );

    const record4PM =
      this.getClosestRecord(
        records,
        16
      );

    const record7PM =
      this.getClosestRecord(
        records,
        19
      );

    const precoolTempChange =
      record2PM && record4PM
        ? record4PM.indoorTemp -
          record2PM.indoorTemp
        : null;

    const onPeakTempChange =
      record4PM && record7PM
        ? record7PM.indoorTemp -
          record4PM.indoorTemp
        : null;

    return {
      date: targetDate,
      thermostat,

      firstReading:
        this.formatPhoenixTime(
          records[0].timestamp
        ),

      lastReading:
        this.formatPhoenixTime(
          records[
            records.length - 1
          ].timestamp
        ),

      totalRuntimeMinutes:
        totalRuntimeSeconds / 60,

      runtime1to2Minutes:
        runtime1to2Seconds / 60,

      sleepRuntimeMinutes:
  sleepRuntimeSeconds / 60,
  
  precoolRuntimeMinutes:
        precoolSeconds / 60,

      onPeakRuntimeMinutes:
        onPeakSeconds / 60,

      runtime4to5Minutes:
        runtime4to5Seconds / 60,

      runtime5to6Minutes:
        runtime5to6Seconds / 60,

      runtime6to7Minutes:
        runtime6to7Seconds / 60,

      // Two-hour pre-cool window
      // = 120 minutes
      precoolDutyCycle:
        (
          precoolSeconds /
          (120 * 60)
        ) * 100,

      // Three-hour APS window
      // = 180 minutes
      onPeakDutyCycle:
        (
          onPeakSeconds /
          (180 * 60)
        ) * 100,

      temp1PM:
        record1PM?.indoorTemp ??
        null,

      temp2PM:
        record2PM?.indoorTemp ??
        null,

      temp4PM:
        record4PM?.indoorTemp ??
        null,

      temp7PM:
        record7PM?.indoorTemp ??
        null,

      setpoint2PM:
        record2PM?.setpoint ??
        null,

      setpoint4PM:
        record4PM?.setpoint ??
        null,

      setpoint7PM:
        record7PM?.setpoint ??
        null,

      precoolTempChange,
      onPeakTempChange,

      firstCoolingAfter4PM:
        this.findFirstCoolingAfter4(
          records
        ),

      longestCoastMinutes:
        this.longestCoastDuringPeak(
          records
        ),

      averageOutdoorTemp2to4:
        this.averageOutdoorTemp(
          records,
          14,
          16
        ),

      averageOutdoorTemp4to7:
        this.averageOutdoorTemp(
          records,
          16,
          19
        ),
    };
  }

  public getAvailableDates():
    string[] {
    const records =
      this.loadRecords();

    return [
      ...new Set(
        records.map(
          (record) =>
            record.localDate
        )
      ),
    ].sort();
  }
}