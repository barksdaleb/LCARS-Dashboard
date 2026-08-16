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

export default function HVACStrategy() {
  const [strategy, setStrategy] =
    useState<StrategyResult | null>(null);

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

    </div>
  );
}