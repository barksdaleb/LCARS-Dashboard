"use client";

import { useEffect, useState } from "react";

type StrategyResult = {
  evidenceQuality: "strong" | "moderate" | "limited";
  matchedDays: number;

  expectedRuntimeMinutes: number;
  actualRuntimeMinutes: number;

  runtimeDifferenceMinutes: number;
  runtimeDifferencePercent: number;

  frontVerdict: "beneficial" | "mixed" | "inconclusive";
  hallVerdict: "beneficial" | "mixed" | "inconclusive";

  verdict:
    | "beneficial"
    | "promising"
    | "mixed"
    | "inconclusive";
};
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

type StrategyAPIResult = StrategyResult & {
  countermeasurePerformance:
    | CountermeasurePerformance
    | null;
};
export default function HVACStrategy() {
 const [strategy, setStrategy] =
  useState<StrategyAPIResult | null>(null);

  useEffect(() => {
    async function loadStrategy() {
      try {
        const response = await fetch(
          "/api/ecobee/strategy"
        );

        if (!response.ok) {
          throw new Error(
            "Strategy API request failed"
          );
        }

        const data = await response.json();

        setStrategy(data);
      } catch (error) {
        console.error(
          "Failed to load HVAC strategy:",
          error
        );
      }
    }

    loadStrategy();
  }, []);

  if (!strategy) {
    return (
      <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">
        <div className="text-cyan-300">
          Analyzing HVAC strategy...
        </div>
      </div>
    );
  }

  const reduction =
    Math.abs(strategy.runtimeDifferencePercent);
const peakStagger =
  strategy.countermeasurePerformance
    ?.countermeasures["front-peak-stagger"] ??
  null;
  return (
    <div className="rounded-xl border-2 border-orange-500 bg-black/40 p-6">

      <div className="text-sm uppercase tracking-[0.3em] text-orange-400">
        HVAC Strategy
      </div>

      <div className="mt-2 text-4xl font-bold uppercase text-green-400">
        {strategy.verdict}
      </div>

      <div className="mt-6 text-5xl font-bold text-cyan-300">
        ↓ {reduction.toFixed(1)}%
      </div>

      <div className="mt-1 text-orange-200">
        4–7 PM cooling runtime
      </div>

      <div className="mt-6 border-t border-cyan-800 pt-4">

        <div className="text-cyan-300">
          Evidence:{" "}
          <span className="font-bold uppercase text-orange-200">
            {strategy.evidenceQuality}
          </span>
          {" · "}
          {strategy.matchedDays} matched days
        </div>

        <div className="mt-3 text-cyan-300">
          Front AC:{" "}
          <span className="font-bold uppercase text-green-400">
            {strategy.frontVerdict}
          </span>
        </div>

        <div className="mt-1 text-cyan-300">
          Hall AC:{" "}
          <span className="font-bold uppercase text-orange-300">
            {strategy.hallVerdict}
          </span>
        </div>

      </div>
{peakStagger && (
  <div className="mt-6 border-t border-cyan-800 pt-4">
    <div className="text-sm uppercase tracking-[0.25em] text-orange-400">
      Peak Stagger
    </div>

    <div className="mt-2 text-2xl font-bold uppercase text-green-400">
      {peakStagger.status}
    </div>

    <div className="mt-2 text-cyan-300">
      {peakStagger.qualifyingDays} /{" "}
      {peakStagger.targetSampleDays} qualifying weekdays
    </div>
<div className="mt-4 grid gap-2 text-cyan-300 md:grid-cols-4">
  <div>
    HVAC overlap:{" "}
    <span className="font-bold text-green-400">
      {peakStagger.metrics.hvacOverlapChangePercent?.toFixed(1)}%
    </span>
  </div>

  <div>
    APS 5–6 demand:{" "}
    <span className="font-bold text-green-400">
      {peakStagger.metrics.aps5to6DemandChangePercent?.toFixed(1)}%
    </span>
  </div>

  <div>
    APS 4–7 peak:{" "}
    <span className="font-bold text-green-400">
      {peakStagger.metrics.aps4to7PeakChangePercent?.toFixed(1)}%
    </span>
  </div>

  <div>
    7 PM comfort:{" "}
    <span className="font-bold text-green-400">
      {peakStagger.metrics.front7PMComfortChangeF?.toFixed(1)}°F
    </span>
  </div>
</div>
    <div className="mt-3 font-bold text-orange-200">
      {peakStagger.recommendation}
    </div>
  </div>
)}
    </div>
  );
}