"use client";

import {
  useEffect,
  useState,
} from "react";

type SavingsData = {
  startDate: string;
  endDate: string;
  days: number;

  totalKWh: number;
  peakDemandKW: number;

  oldPlanComparableCost: number;
  newPlanEnergyCost: number;
  newPlanDemandCost: number;
  newPlanComparableCost: number;

  savingsBeforeTax: number;
  savingsPercent: number;
};

export default function SavingsProof() {
  const [data, setData] =
    useState<SavingsData | null>(null);

  const [error, setError] =
    useState(false);

  useEffect(() => {
    async function loadSavings() {
      try {
        const response = await fetch(
          "/api/aps/savings"
        );

        if (!response.ok) {
          throw new Error(
            "Savings API failed"
          );
        }

        const result =
          await response.json();

        setData(result);
      } catch (err) {
        console.error(
          "Failed to load savings proof:",
          err
        );

        setError(true);
      }
    }

    loadSavings();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border-2 border-red-500 bg-black/40 p-6 text-red-300">
        SAVINGS PROOF OFFLINE
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6 text-cyan-300">
        ANALYZING APS SAVINGS...
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-green-500 bg-black/40 p-8">

      <div className="text-sm uppercase tracking-[0.4em] text-green-400">
        APS SAVINGS PROOF ENGINE
      </div>

      <div className="mt-2 text-4xl font-bold text-orange-100">
        PLAN SAVINGS PROVEN
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">

        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Saved To Date
          </div>

          <div className="mt-2 text-5xl font-bold text-green-400">
            ${data.savingsBeforeTax.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Savings Rate
          </div>

          <div className="mt-2 text-4xl font-bold text-orange-200">
            {data.savingsPercent.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Billing Peak
          </div>

          <div className="mt-2 text-4xl font-bold text-orange-200">
            {data.peakDemandKW.toFixed(2)} kW
          </div>
        </div>

      </div>

      <div className="mt-8 border-t border-cyan-800 pt-6">

        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-cyan-400">
              Old TOU Plan
            </div>

            <div className="mt-1 text-2xl text-orange-200">
              ${data.oldPlanComparableCost.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-cyan-400">
              Current Demand Plan
            </div>

            <div className="mt-1 text-2xl text-orange-200">
              ${data.newPlanComparableCost.toFixed(2)}
            </div>
          </div>

        </div>

      </div>

      <div className="mt-6 text-sm text-cyan-300">
        Same-usage comparison •{" "}
        {data.totalKWh.toFixed(2)} kWh •{" "}
        {data.days} days • through{" "}
        {data.endDate}
      </div>

      <div className="mt-2 text-xs text-orange-300">
        Compares plan-dependent APS tariff charges using the
        same observed electricity usage. Common charges,
        adjustors, taxes and fees are excluded from the
        savings comparison.
      </div>

    </div>
  );
}