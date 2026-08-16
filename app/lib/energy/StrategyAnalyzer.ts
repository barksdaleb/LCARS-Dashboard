import fs from "fs";


export type StrategyConfig = {
  timezone: string;

  baselineStartDate: string;
  strategyStartDate: string;

  precoolStartHour: number;
  peakStartHour: number;
  peakEndHour: number;

  weatherToleranceF: number;
};

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  timezone: "America/Phoenix",

  baselineStartDate: "2026-07-11",
  strategyStartDate: "2026-07-29",

  precoolStartHour: 14,
  peakStartHour: 16,
  peakEndHour: 19,

  weatherToleranceF: 3,
};

export type StrategyPeriod =
  | "baseline"
  | "strategy";

export type StrategyDate = {
  date: string;
  period: StrategyPeriod;
};

export type DailyStrategyPerformance = {
  date: string;
  period: StrategyPeriod;

  averageOutdoorTemp: number | null;

  precoolRuntimeMinutes: number;
  peakRuntimeMinutes: number;

  peakDutyCycle: number;

  tempAtPeakStart: number | null;
  tempAtPeakEnd: number | null;

  peakTempChange: number | null;
};

export type WeatherMatchedComparison = {
  strategyDate: string;

  strategyOutdoorTemp: number;

baselineDates: string[];
baselineDays: number;
confidence: "strong" | "moderate" | "limited";

baselineAverageRuntimeMinutes: number;
  
  strategyRuntimeMinutes: number;

  runtimeDifferenceMinutes: number;
  runtimeDifferencePercent: number;

  baselineAveragePeakTempChange: number | null;
  strategyPeakTempChange: number | null;
};
export type StrategyVerdict = {
  evidenceQuality: "strong" | "moderate" | "limited";
  matchedDays: number;

  expectedRuntimeMinutes: number;
  actualRuntimeMinutes: number;

  runtimeDifferenceMinutes: number;
  runtimeDifferencePercent: number;

  expectedPeakTempChange: number | null;
  actualPeakTempChange: number | null;

  comfortDifferenceF: number | null;

  verdict:
    | "beneficial"
    | "mixed"
    | "inconclusive";
};
export type WholeHouseStrategyVerdict = {
  evidenceQuality: "strong" | "moderate" | "limited";
  matchedDays: number;

  expectedRuntimeMinutes: number;
  actualRuntimeMinutes: number;

  runtimeDifferenceMinutes: number;
  runtimeDifferencePercent: number;

  frontVerdict: StrategyVerdict["verdict"];
  hallVerdict: StrategyVerdict["verdict"];

  verdict:
    | "beneficial"
    | "promising"
    | "mixed"
    | "inconclusive";
};
export class StrategyAnalyzer {
  constructor(
    private config: StrategyConfig =
      DEFAULT_STRATEGY_CONFIG
  ) {}

  private isWeekday(
    dateString: string
  ): boolean {
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    const dayOfWeek = date.getUTCDay();

    return (
      dayOfWeek >= 1 &&
      dayOfWeek <= 5
    );
  }

  public classifyDates(
    dates: string[]
  ): StrategyDate[] {
    return [...new Set(dates)]
      .sort()
      .filter((date) =>
        this.isWeekday(date)
      )
      .filter(
        (date) =>
          date >=
          this.config.baselineStartDate
      )
      .map((date) => ({
        date,
        period:
          date <
          this.config.strategyStartDate
            ? "baseline"
            : "strategy",
      }));


      
  }
    public getHistoryDates(
    filename: string
  ): string[] {
    const csv = fs.readFileSync(filename, "utf8");

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    // Remove CSV header
    lines.shift();

    const dates = new Set<string>();

    const formatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: this.config.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

    for (const line of lines) {
      const values = line.split(",");
      const timestamp = new Date(values[0]);

      if (Number.isNaN(timestamp.getTime())) {
        continue;
      }

      dates.add(formatter.format(timestamp));
    }

    return [...dates].sort();
  }

  public analyzeDay(
    filename: string,
    targetDate: string
  ): DailyStrategyPerformance {
    const csv = fs.readFileSync(filename, "utf8");

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    lines.shift();

    let precoolSeconds = 0;
    let peakSeconds = 0;

    const outdoorTemps: number[] = [];

    let tempAtPeakStart: number | null = null;
    let tempAtPeakEnd: number | null = null;

    let closestPeakStartMinutes = Infinity;
    let closestPeakEndMinutes = Infinity;

    const formatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: this.config.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    );

    for (const line of lines) {
      const values = line.split(",");

      const timestamp = new Date(values[0]);

      if (Number.isNaN(timestamp.getTime())) {
        continue;
      }

      const parts = formatter.formatToParts(timestamp);

      const get = (type: string) =>
        parts.find(
          (part) => part.type === type
        )?.value;

      const year = get("year");
      const month = get("month");
      const day = get("day");
      const hourText = get("hour");
      const minuteText = get("minute");

      if (
        !year ||
        !month ||
        !day ||
        hourText === undefined ||
        minuteText === undefined
      ) {
        continue;
      }

      const localDate =
        `${year}-${month}-${day}`;

      if (localDate !== targetDate) {
        continue;
      }

      const hour = Number(hourText);
      const minute = Number(minuteText);

      const indoorTemp = Number(values[2]);
      const outdoorTemp = Number(values[3]);
      const coolRuntimeSeconds = Number(values[6]);

      if (
        !Number.isFinite(indoorTemp) ||
        !Number.isFinite(coolRuntimeSeconds)
      ) {
        continue;
      }

      if (
        hour >= this.config.precoolStartHour &&
        hour < this.config.peakStartHour
      ) {
        precoolSeconds += coolRuntimeSeconds;
      }

      if (
        hour >= this.config.peakStartHour &&
        hour < this.config.peakEndHour
      ) {
        peakSeconds += coolRuntimeSeconds;

        if (
          Number.isFinite(outdoorTemp) &&
          outdoorTemp > 0
        ) {
          outdoorTemps.push(outdoorTemp);
        }
      }

      const recordMinutes =
        hour * 60 + minute;

      const peakStartMinutes =
        this.config.peakStartHour * 60;

      const peakEndMinutes =
        this.config.peakEndHour * 60;

      const startDifference = Math.abs(
        recordMinutes - peakStartMinutes
      );

      const endDifference = Math.abs(
        recordMinutes - peakEndMinutes
      );

      if (
        startDifference <
        closestPeakStartMinutes
      ) {
        closestPeakStartMinutes =
          startDifference;

        tempAtPeakStart = indoorTemp;
      }

      if (
        endDifference <
        closestPeakEndMinutes
      ) {
        closestPeakEndMinutes =
          endDifference;

        tempAtPeakEnd = indoorTemp;
      }
    }

    const peakWindowMinutes =
      (this.config.peakEndHour -
        this.config.peakStartHour) *
      60;

    const averageOutdoorTemp =
      outdoorTemps.length > 0
        ? outdoorTemps.reduce(
            (sum, temp) => sum + temp,
            0
          ) / outdoorTemps.length
        : null;

    const peakTempChange =
      tempAtPeakStart !== null &&
      tempAtPeakEnd !== null
        ? tempAtPeakEnd -
          tempAtPeakStart
        : null;

    return {
      date: targetDate,

      period:
        targetDate <
        this.config.strategyStartDate
          ? "baseline"
          : "strategy",

      averageOutdoorTemp,

      precoolRuntimeMinutes:
        precoolSeconds / 60,

      peakRuntimeMinutes:
        peakSeconds / 60,

      peakDutyCycle:
        (peakSeconds /
          (peakWindowMinutes * 60)) *
        100,

      tempAtPeakStart,
      tempAtPeakEnd,

      peakTempChange,
    };
  }


  public compareWeatherMatchedDays(
    filename: string
  ): WeatherMatchedComparison[] {
    const dates = this.getHistoryDates(filename);

    const classified =
      this.classifyDates(dates);

    const performances = classified.map(
      (day) =>
        this.analyzeDay(
          filename,
          day.date
        )
    );

    const baselineDays = performances.filter(
      (day) =>
        day.period === "baseline" &&
        day.averageOutdoorTemp !== null
    );

    const strategyDays = performances.filter(
      (day) =>
        day.period === "strategy" &&
        day.averageOutdoorTemp !== null
    );

    const comparisons: WeatherMatchedComparison[] =
      [];

    for (const strategyDay of strategyDays) {
      if (
        strategyDay.averageOutdoorTemp === null
      ) {
        continue;
      }

      const strategyOutdoorTemp =
  strategyDay.averageOutdoorTemp;

const matches = baselineDays.filter(
  (baselineDay) =>
    baselineDay.averageOutdoorTemp !== null &&
    Math.abs(
      baselineDay.averageOutdoorTemp -
        strategyOutdoorTemp
    ) <= this.config.weatherToleranceF
);

      if (matches.length === 0) {
        continue;
      }

      const baselineAverageRuntimeMinutes =
        matches.reduce(
          (sum, day) =>
            sum + day.peakRuntimeMinutes,
          0
        ) / matches.length;

      const runtimeDifferenceMinutes =
        strategyDay.peakRuntimeMinutes -
        baselineAverageRuntimeMinutes;

      const runtimeDifferencePercent =
        baselineAverageRuntimeMinutes > 0
          ? (runtimeDifferenceMinutes /
              baselineAverageRuntimeMinutes) *
            100
          : 0;

      const tempChanges = matches
        .map((day) => day.peakTempChange)
        .filter(
          (value): value is number =>
            value !== null
        );

      const baselineAveragePeakTempChange =
        tempChanges.length > 0
          ? tempChanges.reduce(
              (sum, value) => sum + value,
              0
            ) / tempChanges.length
            : null;
      const confidence:
        "strong" | "moderate" | "limited" =
        matches.length >= 5
          ? "strong"
          : matches.length >= 3
            ? "moderate"
            : "limited";

      comparisons.push({
        strategyDate: strategyDay.date,

        strategyOutdoorTemp:
          strategyDay.averageOutdoorTemp,

        baselineDates: matches.map(
          (day) => day.date
        ),

        baselineDays: matches.length,
        confidence,

        baselineAverageRuntimeMinutes,

        strategyRuntimeMinutes:
          strategyDay.peakRuntimeMinutes,

        runtimeDifferenceMinutes,

        runtimeDifferencePercent,

        baselineAveragePeakTempChange,

        strategyPeakTempChange:
          strategyDay.peakTempChange,
      });
    }

    return comparisons;
  }
  public calculateVerdict(
    filename: string
  ): StrategyVerdict {
    const comparisons =
      this.compareWeatherMatchedDays(filename);

    const strongDays = comparisons.filter(
      (comparison) =>
        comparison.confidence === "strong"
    );

    if (strongDays.length === 0) {
      return {
        evidenceQuality: "limited",
        matchedDays: 0,

        expectedRuntimeMinutes: 0,
        actualRuntimeMinutes: 0,

        runtimeDifferenceMinutes: 0,
        runtimeDifferencePercent: 0,

        expectedPeakTempChange: null,
        actualPeakTempChange: null,

        comfortDifferenceF: null,

        verdict: "inconclusive",
      };
    }

    const expectedRuntimeMinutes =
      strongDays.reduce(
        (sum, day) =>
          sum +
          day.baselineAverageRuntimeMinutes,
        0
      );

    const actualRuntimeMinutes =
      strongDays.reduce(
        (sum, day) =>
          sum +
          day.strategyRuntimeMinutes,
        0
      );

    const runtimeDifferenceMinutes =
      actualRuntimeMinutes -
      expectedRuntimeMinutes;

    const runtimeDifferencePercent =
      expectedRuntimeMinutes > 0
        ? (runtimeDifferenceMinutes /
            expectedRuntimeMinutes) *
          100
        : 0;

    const expectedTempChanges = strongDays
      .map(
        (day) =>
          day.baselineAveragePeakTempChange
      )
      .filter(
        (value): value is number =>
          value !== null
      );

    const actualTempChanges = strongDays
      .map(
        (day) =>
          day.strategyPeakTempChange
      )
      .filter(
        (value): value is number =>
          value !== null
      );

    const expectedPeakTempChange =
      expectedTempChanges.length > 0
        ? expectedTempChanges.reduce(
            (sum, value) => sum + value,
            0
          ) / expectedTempChanges.length
        : null;

    const actualPeakTempChange =
      actualTempChanges.length > 0
        ? actualTempChanges.reduce(
            (sum, value) => sum + value,
            0
          ) / actualTempChanges.length
        : null;

    const comfortDifferenceF =
      expectedPeakTempChange !== null &&
      actualPeakTempChange !== null
        ? actualPeakTempChange -
          expectedPeakTempChange
        : null;

    const evidenceQuality:
      "strong" | "moderate" | "limited" =
      strongDays.length >= 5
        ? "strong"
        : strongDays.length >= 3
          ? "moderate"
          : "limited";

    let verdict:
      | "beneficial"
      | "mixed"
      | "inconclusive";

    const comfortPreserved =
      comfortDifferenceF === null ||
      comfortDifferenceF <= 1;

    if (
      runtimeDifferencePercent <= -5 &&
      comfortPreserved
    ) {
      verdict = "beneficial";
    } else if (
      runtimeDifferencePercent < 0
    ) {
      verdict = "mixed";
    } else {
      verdict = "inconclusive";
    }

    return {
      evidenceQuality,
      matchedDays: strongDays.length,

      expectedRuntimeMinutes,
      actualRuntimeMinutes,

      runtimeDifferenceMinutes,
      runtimeDifferencePercent,

      expectedPeakTempChange,
      actualPeakTempChange,

      comfortDifferenceF,

      verdict,
    };
  }
  public calculateWholeHouseVerdict(
    frontFilename: string,
    hallFilename: string
  ): WholeHouseStrategyVerdict {
    const frontComparisons =
      this.compareWeatherMatchedDays(
        frontFilename
      );

    const hallComparisons =
      this.compareWeatherMatchedDays(
        hallFilename
      );

    const frontStrong = new Map(
      frontComparisons
        .filter(
          (day) =>
            day.confidence === "strong"
        )
        .map((day) => [
          day.strategyDate,
          day,
        ])
    );

    const hallStrong = new Map(
      hallComparisons
        .filter(
          (day) =>
            day.confidence === "strong"
        )
        .map((day) => [
          day.strategyDate,
          day,
        ])
    );

    const commonDates = [
      ...frontStrong.keys(),
    ].filter((date) =>
      hallStrong.has(date)
    );
    let expectedRuntimeMinutes = 0;
    let actualRuntimeMinutes = 0;

    for (const date of commonDates) {
      const front = frontStrong.get(date);
      const hall = hallStrong.get(date);

      if (!front || !hall) {
        continue;
      }

      expectedRuntimeMinutes +=
        front.baselineAverageRuntimeMinutes +
        hall.baselineAverageRuntimeMinutes;

      actualRuntimeMinutes +=
        front.strategyRuntimeMinutes +
        hall.strategyRuntimeMinutes;
    }

    const runtimeDifferenceMinutes =
      actualRuntimeMinutes -
      expectedRuntimeMinutes;

    const runtimeDifferencePercent =
      expectedRuntimeMinutes > 0
        ? (runtimeDifferenceMinutes /
            expectedRuntimeMinutes) *
          100
        : 0;
        const evidenceQuality:
      "strong" | "moderate" | "limited" =
      commonDates.length >= 5
        ? "strong"
        : commonDates.length >= 3
          ? "moderate"
          : "limited";

    const frontVerdict =
      this.calculateVerdict(
        frontFilename
      ).verdict;

    const hallVerdict =
      this.calculateVerdict(
        hallFilename
      ).verdict;
          let verdict:
      | "beneficial"
      | "promising"
      | "mixed"
      | "inconclusive";

    if (commonDates.length === 0) {
      verdict = "inconclusive";
    } else if (
      runtimeDifferencePercent <= -5 &&
      frontVerdict === "beneficial" &&
      hallVerdict === "beneficial"
    ) {
      verdict = "beneficial";
    } else if (
      runtimeDifferencePercent <= -5 &&
      (
        frontVerdict === "beneficial" ||
        hallVerdict === "beneficial"
      )
    ) {
      verdict = "promising";
    } else if (
      runtimeDifferencePercent < 0
    ) {
      verdict = "mixed";
    } else {
      verdict = "inconclusive";
    }  
      return {
      evidenceQuality,
      matchedDays: commonDates.length,

           expectedRuntimeMinutes,
      actualRuntimeMinutes,

      runtimeDifferenceMinutes,
      runtimeDifferencePercent,

frontVerdict,
hallVerdict,

      verdict,
    };
  }
}