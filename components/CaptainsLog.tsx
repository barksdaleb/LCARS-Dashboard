"use client";

import energy from "@/data/energy.json";
import { useEffect, useState } from "react";

type CountermeasurePerformance = {
  generatedAt: string;

  countermeasures: {
    "front-peak-stagger"?: {
      id: string;
      name: string;
      status: string;
      recommendation: string;

      qualifyingDays: number;
      targetSampleDays: number;
      remainingDays: number;

      metrics: {
        hvacOverlapChangePercent: number | null;
        aps5to6DemandChangePercent: number | null;
        aps4to7PeakChangePercent: number | null;
        front7PMComfortChangeF: number | null;
      };

      indicators: {
        hvacOverlapImproved: boolean;
        aps5to6DemandImproved: boolean;
        aps4to7PeakImproved: boolean;
        comfortPenalty: boolean;
      };

      strategyStartDate: string;
      evaluatedThrough: string;
    };
  };
};

type HVACStrategyResult = {
  evidenceQuality: "strong" | "moderate" | "limited";
  matchedDays: number;

  expectedRuntimeMinutes: number;
  actualRuntimeMinutes: number;

  runtimeDifferenceMinutes: number;
  runtimeDifferencePercent: number;

  frontVerdict:
    | "beneficial"
    | "mixed"
    | "inconclusive";

  hallVerdict:
    | "beneficial"
    | "mixed"
    | "inconclusive";

  verdict:
    | "beneficial"
    | "promising"
    | "mixed"
    | "inconclusive";

  countermeasurePerformance?:
    | CountermeasurePerformance
    | null;
};

type SavingsProofResult = {
  startDate: string;
  endDate: string;
  days: number;

  onPeakKWh: number;
  offPeakKWh: number;
  superOffPeakKWh?: number;
  totalKWh: number;

  peakDemandKW: number;

  oldPlanComparableCost: number;
  newPlanComparableCost: number;

  savingsBeforeTax: number;
  savingsPercent: number;
};

type TeslaSummary = {
  sessions: number;
  totalEnergyKwh: number;
  totalChargingMinutes: number;
  offPeakSessions: number;
  onPeakOverlapSessions: number;
  onPeakOverlapMinutes: number;
  estimatedOnPeakEnergyKwh: number;
};

type TeslaChargingAnalysis = {
  available: boolean;
  cycleStart: string;

  history: TeslaSummary;

  currentCycle: TeslaSummary;

  latestSession: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
    energyKwh: number;
    averageKw: number;
    onPeakOverlapMinutes: number;
    estimatedOnPeakKwh: number;
    source: string;
  } | null;
};

type CaptainsLogProps = {
  currentDemand: number;
  peakToday: number;
  apsStatus: string;
  hvacStrategy?: HVACStrategyResult | null;
  savingsProof?: SavingsProofResult | null;
};

export default function CaptainsLog({
  currentDemand,
  apsStatus,
  hvacStrategy = null,
  savingsProof = null,
}: CaptainsLogProps) {
  const ai = energy.ai;

  const [tesla, setTesla] =
    useState<TeslaChargingAnalysis | null>(null);

  // -------------------------------------------------------
  // TESLA CHARGING ANALYSIS
  // -------------------------------------------------------

  useEffect(() => {
    async function loadTesla() {
      try {
        const response = await fetch("/api/tesla");

        if (!response.ok) {
          throw new Error(
            "Tesla charging request failed"
          );
        }

        const data: TeslaChargingAnalysis =
          await response.json();

        setTesla(data);
      } catch (error) {
        console.error(
          "Failed to load Tesla data for Captain's Log:",
          error
        );
      }
    }

    loadTesla();
  }, []);

  // -------------------------------------------------------
  // BASE AI STATE
  // -------------------------------------------------------

  let headline = ai.headline;
  let summary = ai.summary;
  let recommendation = ai.recommendation;

  // Remove observations that now have live/data-driven
  // replacements.
  const observations = ai.observations.filter(
    (item) => {
      const text = item.text.toLowerCase();

      return (
        !text.includes("ecobee runtime analysis") &&
        !text.includes("tesla charging")
      );
    }
  );

  // -------------------------------------------------------
  // HVAC STRATEGY
  // -------------------------------------------------------

  if (hvacStrategy) {
    const runtimeReduction = Math.abs(
      hvacStrategy.runtimeDifferencePercent
    );

    observations.push({
      status: "success",
      text:
        `HVAC strategy analysis is ${hvacStrategy.verdict.toUpperCase()}. ` +
        `4–7 PM cooling runtime is ${runtimeReduction.toFixed(1)}% lower ` +
        `across ${hvacStrategy.matchedDays} strongly matched weather days.`,
    });

    if (
      hvacStrategy.hallVerdict === "mixed"
    ) {
      observations.push({
        status: "warning",
        text:
          "Hall AC runtime improved substantially, but temperature performance indicates the strategy still needs optimization.",
      });
    }

    const peakStagger =
      hvacStrategy.countermeasurePerformance
        ?.countermeasures["front-peak-stagger"];

    if (peakStagger) {
      const overlapChange =
        peakStagger.metrics
          .hvacOverlapChangePercent;

      const apsDemandChange =
        peakStagger.metrics
          .aps5to6DemandChangePercent;

      observations.push({
        status:
          peakStagger.indicators.comfortPenalty
            ? "warning"
            : "success",

        text:
          `Peak Stagger is ${peakStagger.status}. ` +
          `HVAC overlap changed ${
            overlapChange === null
              ? "--"
              : `${overlapChange.toFixed(1)}%`
          } and APS 5–6 PM demand changed ${
            apsDemandChange === null
              ? "--"
              : `${apsDemandChange.toFixed(1)}%`
          } across ${peakStagger.qualifyingDays}/${peakStagger.targetSampleDays} qualifying weekdays. ` +
          `Home Ops recommendation: ${peakStagger.recommendation}.`,
      });

      recommendation =
        peakStagger.recommendation;
    }
  }

  // -------------------------------------------------------
  // APS SAVINGS PROOF
  // -------------------------------------------------------

  if (
    savingsProof &&
    savingsProof.savingsBeforeTax > 0
  ) {
    observations.push({
      status: "success",

      text:
        `APS Savings Proof Engine confirms $${savingsProof.savingsBeforeTax.toFixed(
          2
        )} ` +
        `saved to date — ${savingsProof.savingsPercent.toFixed(
          1
        )}% lower plan-dependent ` +
        `cost using the same ${savingsProof.totalKWh.toFixed(
          2
        )} kWh of observed usage.`,
    });
  }

  // -------------------------------------------------------
  // TESLA CHARGING
  // -------------------------------------------------------

  if (tesla?.available) {
    const cycle =
      tesla.currentCycle;

    if (cycle.sessions === 0) {
      observations.push({
        status: "success",

        text:
          `Tesla charging history is connected. No charging sessions are recorded yet for the APS billing cycle beginning ${tesla.cycleStart}.`,
      });
    } else if (
      cycle.onPeakOverlapSessions === 0
    ) {
      observations.push({
        status: "success",

        text:
          `Tesla charging remained outside the APS 4–7 PM demand window this billing cycle. ` +
          `${cycle.sessions} charging session${
            cycle.sessions === 1 ? "" : "s"
          } delivered ${cycle.totalEnergyKwh.toFixed(
            1
          )} kWh with no on-peak overlap.`,
      });
    } else {
      observations.push({
        status: "warning",

        text:
          `Tesla charging overlapped the APS 4–7 PM demand window ` +
          `${cycle.onPeakOverlapSessions} time${
            cycle.onPeakOverlapSessions === 1
              ? ""
              : "s"
          } this billing cycle, totaling ` +
          `${cycle.onPeakOverlapMinutes} minute${
            cycle.onPeakOverlapMinutes === 1
              ? ""
              : "s"
          } of overlap. ` +
          `Estimated energy during the overlap was ${cycle.estimatedOnPeakEnergyKwh.toFixed(
            2
          )} kWh.`,
      });
    }
  }

  // -------------------------------------------------------
  // APS WINDOW
  // -------------------------------------------------------

  if (apsStatus === "ON PEAK") {
    headline =
      "HIGH DEMAND WINDOW ACTIVE";

    summary =
      "Engineering recommends minimizing large electrical loads until APS demand pricing ends.";

    recommendation =
      "Delay EV charging, pool equipment, laundry, and other high-power devices.";
  }

  // -------------------------------------------------------
  // LOW DEMAND
  //
  // Do not allow low demand to override an active APS
  // demand window.
  // -------------------------------------------------------

  if (
    currentDemand < 3 &&
    apsStatus !== "ON PEAK"
  ) {
    headline =
      "SYSTEMS OPERATING NORMALLY";

    summary =
      "Electrical demand remains well below operational limits. All monitored systems are functioning within expected parameters.";

    recommendation =
      "No action required. Continue normal operation.";
  }

  // -------------------------------------------------------
  // DATA SOURCES
  // -------------------------------------------------------

  const sources = ai.sources.map(
    (source) => {
      if (
        source.name
          .toLowerCase()
          .includes("tesla")
      ) {
        return {
          ...source,
          status: tesla?.available
            ? "online"
            : source.status,
        };
      }

      return source;
    }
  );

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-8">
      <div className="text-sm tracking-[0.4em] uppercase text-cyan-400">
        CAPTAIN&apos;S LOG
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-4xl font-bold text-orange-100 tracking-wide">
          {ai.title}
        </h2>

        <div className="rounded-full border border-cyan-500 bg-cyan-950/40 px-4 py-1 text-cyan-300">
          AI Confidence {ai.confidence}%
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="text-2xl font-semibold text-cyan-300">
          {headline}
        </div>

        <div className="text-xl leading-8 text-orange-300 border-l-4 border-cyan-500 pl-5">
          {summary}
        </div>

        <div className="border-t border-cyan-700 pt-6">
          <div className="mb-4 text-sm uppercase tracking-[0.3em] text-cyan-400">
            Observations
          </div>

          <div className="space-y-3">
            {observations.map(
              (item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3"
                >
                  <div
                    className={
                      item.status ===
                      "success"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {item.status ===
                    "success"
                      ? "✓"
                      : "⚠"}
                  </div>

                  <div className="text-lg text-orange-200">
                    {item.text}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="border-t border-cyan-700 pt-5">
          <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            RECOMMENDED ACTION
          </div>

          <div className="mt-2 text-xl text-cyan-300">
            {recommendation}
          </div>
        </div>

        <div className="border-t border-cyan-700 pt-5">
          <div className="mt-4 grid grid-cols-2 gap-2">
            {sources.map(
              (source, index) => (
                <div
                  key={index}
                  className={`text-sm ${
                    source.status ===
                    "online"
                      ? "text-green-400"
                      : source.status ===
                        "partial"
                      ? "text-orange-300"
                      : "text-yellow-400"
                  }`}
                >
                  {source.status ===
                  "online"
                    ? "✓"
                    : source.status ===
                      "partial"
                    ? "◐"
                    : "○"}{" "}
                  {source.name}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}