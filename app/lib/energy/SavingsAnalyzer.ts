import fs from "fs";

export type APSPlanRates = {
  onPeakRate: number;
  offPeakRate: number;
  demandRate: number;
};

export type SavingsAnalysis = {
  startDate: string;
  endDate: string;

  days: number;

  onPeakKWh: number;
  offPeakKWh: number;
  totalKWh: number;

  peakDemandKW: number;

  oldPlanEnergyCost: number;

  newPlanEnergyCost: number;
  newPlanDemandCost: number;

  oldPlanComparableCost: number;
  newPlanComparableCost: number;

  savingsBeforeTax: number;
  savingsPercent: number;
};

export const OLD_TOU_RATES: APSPlanRates = {
  onPeakRate: 0.34396,
  offPeakRate: 0.12345,
  demandRate: 0,
};

export const NEW_DEMAND_RATES: APSPlanRates = {
  onPeakRate: 0,
  offPeakRate: 0,
  demandRate: 19.585,
};

type APSDailyRecord = {
  date: string;
  onPeakKWh: number;
  offPeakKWh: number;
  totalKWh: number;
  demandKW: number | null;
  currentPeakDemandKW: number | null;
};

export class SavingsAnalyzer {
  constructor(
    private filename: string
  ) {}

  private loadRecords(): APSDailyRecord[] {
    const csv = fs.readFileSync(
      this.filename,
      "utf8"
    );

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    const header = lines.shift();

    if (!header) {
      return [];
    }

    const columns = header.split(",");

    const index = (name: string) =>
      columns.indexOf(name);

    return lines
      .map((line) => {
        const values = line.split(",");

        const numberOrZero = (
          value: string | undefined
        ) => {
          const parsed = Number(value);
          return Number.isFinite(parsed)
            ? parsed
            : 0;
        };

        const numberOrNull = (
          value: string | undefined
        ) => {
          if (!value) {
            return null;
          }

          const parsed = Number(value);

          return Number.isFinite(parsed)
            ? parsed
            : null;
        };

        return {
          date: values[index("date")],

          onPeakKWh: numberOrZero(
            values[index("onPeakKWh")]
          ),

          offPeakKWh: numberOrZero(
            values[index("offPeakKWh")]
          ),

          totalKWh: numberOrZero(
            values[index("totalKWh")]
          ),

          demandKW: numberOrNull(
            values[index("demandKW")]
          ),

          currentPeakDemandKW: numberOrNull(
            values[index("currentPeakDemandKW")]
          ),
        };
      })
      .filter((record) => record.date)
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );
  }

  public getUsage(
    startDate: string,
    endDate: string
  ) {
    const records = this.loadRecords().filter(
      (record) =>
        record.date >= startDate &&
        record.date <= endDate
    );

    let onPeakKWh = 0;
    let offPeakKWh = 0;
    let totalKWh = 0;
    let peakDemandKW = 0;

    for (const record of records) {
      onPeakKWh += record.onPeakKWh;
      offPeakKWh += record.offPeakKWh;
      totalKWh += record.totalKWh;

      peakDemandKW = Math.max(
        peakDemandKW,
        record.demandKW ?? 0,
        record.currentPeakDemandKW ?? 0
      );
    }

    return {
      startDate,
      endDate,
      days: records.length,
      onPeakKWh,
      offPeakKWh,
      totalKWh,
      peakDemandKW,
    };
  }
  public calculateOldPlanCost(
    startDate: string,
    endDate: string
  ) {
    const usage = this.getUsage(
      startDate,
      endDate
    );

    const onPeakCost =
      usage.onPeakKWh *
      OLD_TOU_RATES.onPeakRate;

    const offPeakCost =
      usage.offPeakKWh *
      OLD_TOU_RATES.offPeakRate;

    const totalEnergyCost =
      onPeakCost + offPeakCost;

    return {
      ...usage,

      onPeakCost,
      offPeakCost,
      totalEnergyCost,
    };
  }    
  
}