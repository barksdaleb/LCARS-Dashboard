"use client";

import Link from "next/link";
import energy from "../../data/energy.json";
import DemandMeter from "../../components/DemandMeter";

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-orange-500 bg-black/40 p-6 shadow-lg">
      <div className="text-xs uppercase tracking-[0.35em] text-orange-400">
        {title}
      </div>

      <div className="mt-4 text-5xl font-bold text-orange-200">
        {value}
      </div>

      {subtitle && (
        <div className="mt-3 text-orange-300/70">
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function BHEMPage() {
  return (
    <main className="min-h-screen bg-black text-orange-200 p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500 pb-6">

          <div>
            <h1 className="text-6xl font-bold tracking-[0.45em]">
              BHEM
            </h1>

            <div className="mt-3 text-xl text-orange-400">
              Barksdale Home Energy Model
            </div>
          </div>

          <div className="text-right">
            <div className="text-4xl font-bold text-cyan-300">
              OFF PEAK
            </div>

            <div className="text-orange-400">
              APS Status
            </div>

            <div className="mt-3 text-xl">
  {new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })}
</div>
          </div>

        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded-lg border border-orange-500 px-5 py-3 transition hover:bg-orange-500 hover:text-black"
          >
            ← LCARS Home
          </Link>
        </div>

        {/* Home Energy */}
        <div className="mt-10">

          <h2 className="mb-4 text-2xl text-cyan-400">
            Home Energy
          </h2>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

            <Card
              title="Yesterday"
              value={energy.energy.yesterday.toString()}
              subtitle="kWh"
            />

            <Card
              title="Today"
              value={energy.energy.today.toString()}
              subtitle="kWh So Far"
            />

            <Card
              title="Current Demand"
              value={energy.energy.currentDemand.toString()}
              subtitle="kW"
            />

            <Card
              title="Peak Demand"
              value={energy.energy.peakDemand.toString()}
              subtitle="Today's Peak"
            />

          </div>

        </div>

        {/* Home Systems */}
        <div className="mt-12">

          <h2 className="mb-4 text-2xl text-cyan-400">
            Home Systems
          </h2>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

            <Card
              title="Front HVAC"
              value={energy.systems.frontHVAC.runtime}
              subtitle="Running"
            />

            <Card
              title="Hall HVAC"
              value={energy.systems.hallHVAC.runtime}
              subtitle="Idle"
            />

            <Card
              title="Pool"
              value={`${energy.systems.pool.temperature}°`}
              subtitle="Water Temp"
            />

            <Card
              title="Outside"
              value={`${energy.systems.weather.temperature}°`}
              subtitle="Phoenix"
            />

          </div>

        </div>

        {/* Energy Systems */}
        <div className="mt-12">

          <h2 className="mb-4 text-2xl text-cyan-400">
            Energy Systems
          </h2>

          <div className="grid gap-6 md:grid-cols-3">

            <Card
              title="Tesla"
              value="81%"
              subtitle="Ready • Charges 8 PM"
            />

            <Card
              title="Jackery"
              value="100%"
              subtitle="42W Load"
            />

            <Card
              title="Estimated Savings"
              value="$512"
              subtitle="Projected Annual Savings"
            />

          </div>

        </div>

        {/* AI Advisor */}
        <div className="mt-12 rounded-xl border-2 border-cyan-500 bg-black/40 p-8">

          <div className="text-3xl font-bold text-cyan-300">
            AI Home Advisor
          </div>

          <div className="mt-6 text-3xl text-orange-200">
            {energy.ai.headline}
          </div>

          <div className="mt-4 text-xl text-orange-300">
            {energy.ai.recommendation}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">

            <div className="rounded-lg border border-green-500 p-4">
              ✅ Tesla scheduled for Off-Peak charging
            </div>

            <div className="rounded-lg border border-green-500 p-4">
              ✅ Pool pump optimized
            </div>

            <div className="rounded-lg border border-yellow-500 p-4">
              ⚠ Continue monitoring HVAC runtime
            </div>

            <div className="rounded-lg border border-cyan-500 p-4">
              💰 Projected savings: $500+/year
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}