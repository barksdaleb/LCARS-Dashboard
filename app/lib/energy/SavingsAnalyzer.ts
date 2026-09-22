import fs from "fs";

export type APSPlanRates = {
  onPeakRate: number;
  offPeakRate: number;
  superOffPeakRate?: number;
  demandRate: number;
};

export type SavingsAnalysis = {
  startDate: string;
  endDate: string;

  days: number;

  onPeakKWh: number;
  offPeakKWh: number;
  superOffPeakKWh: number;
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
  onPeakRate: 0.14227,
  offPeakRate: 0.05943,
  demandRate: 19.585,
};

type APSDailyRecord = {
  date: string;
  onPeakKWh: number;
  offPeakKWh: number;
  superOffPeakKWh: number;
  totalKWh: number;
  demandKW: number | null;
  currentPeakDemandKW: number | null;
};

export class SavingsAnalyzer {
  constructor(
    private filename: string,
    private oldPlanRates: APSPlanRates = OLD_TOU_RATES,
    private newPlanRates: APSPlanRates = NEW_DEMAND_RATES,
  ) {}

  private superOffPeakCost(kWh: number, rates: APSPlanRates): number {
    if (kWh === 0) return 0;
    if (rates.superOffPeakRate === undefined || !Number.isFinite(rates.superOffPeakRate) || rates.superOffPeakRate < 0) {
      throw new Error("A super-off-peak rate is required to price super-off-peak usage.");
    }
    return kWh * rates.superOffPeakRate;
  }

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

          superOffPeakKWh: numberOrZero(
            values[index("superOffPeakKWh")]
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
    let superOffPeakKWh = 0;
    let totalKWh = 0;
    let peakDemandKW = 0;

    for (const record of records) {
      onPeakKWh += record.onPeakKWh;
      offPeakKWh += record.offPeakKWh;
      superOffPeakKWh += record.superOffPeakKWh;
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
      superOffPeakKWh,
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
      this.oldPlanRates.onPeakRate;

    const offPeakCost =
      usage.offPeakKWh *
      this.oldPlanRates.offPeakRate;

    const superOffPeakCost = this.superOffPeakCost(usage.superOffPeakKWh, this.oldPlanRates);
    const totalEnergyCost =
      onPeakCost + offPeakCost + superOffPeakCost;

    return {
      ...usage,

      onPeakCost,
      offPeakCost,
      superOffPeakCost,
      totalEnergyCost,
    };
  }    
    public calculateNewPlanCost(
    startDate: string,
    endDate: string
  ) {
    const usage = this.getUsage(
      startDate,
      endDate
    );

    const onPeakCost =
      usage.onPeakKWh *
      this.newPlanRates.onPeakRate;

    const offPeakCost =
      usage.offPeakKWh *
      this.newPlanRates.offPeakRate;

    const superOffPeakCost = this.superOffPeakCost(usage.superOffPeakKWh, this.newPlanRates);

    const demandCost =
      usage.peakDemandKW *
      this.newPlanRates.demandRate;

    const totalEnergyAndDemandCost =
      onPeakCost +
      offPeakCost +
      superOffPeakCost +
      demandCost;

    return {
      ...usage,

      onPeakCost,
      offPeakCost,
      superOffPeakCost,
      demandCost,

      totalEnergyAndDemandCost,
    };
  }
  public comparePlans(
    startDate: string,
    endDate: string
  ): SavingsAnalysis {
    const oldPlan =
      this.calculateOldPlanCost(
        startDate,
        endDate
      );

    const newPlan =
      this.calculateNewPlanCost(
        startDate,
        endDate
      );

    const savingsBeforeTax =
      oldPlan.totalEnergyCost -
      newPlan.totalEnergyAndDemandCost;

    const savingsPercent =
      oldPlan.totalEnergyCost > 0
        ? (savingsBeforeTax /
            oldPlan.totalEnergyCost) *
          100
        : 0;

    return {
      startDate,
      endDate,

      days: oldPlan.days,

      onPeakKWh: oldPlan.onPeakKWh,
      offPeakKWh: oldPlan.offPeakKWh,
      superOffPeakKWh: oldPlan.superOffPeakKWh,
      totalKWh: oldPlan.totalKWh,

      peakDemandKW:
        oldPlan.peakDemandKW,

      oldPlanEnergyCost:
        oldPlan.totalEnergyCost,

      newPlanEnergyCost:
        newPlan.onPeakCost +
        newPlan.offPeakCost +
        newPlan.superOffPeakCost,

      newPlanDemandCost:
        newPlan.demandCost,

      oldPlanComparableCost:
        oldPlan.totalEnergyCost,

      newPlanComparableCost:
        newPlan.totalEnergyAndDemandCost,

      savingsBeforeTax,
      savingsPercent,
    };
  }

}