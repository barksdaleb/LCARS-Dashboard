"use client";

import { useEffect, useState } from "react";

type TeslaChargingSession = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  energyKwh: number;
  averageKw: number;
  onPeakOverlapMinutes: number;
  estimatedOnPeakKwh: number;
  source: string;
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
  latestSession: TeslaChargingSession | null;
};

function formatDuration(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TeslaCharging() {
  const [analysis, setAnalysis] =
    useState<TeslaChargingAnalysis | null>(null);

  const [error, setError] = useState(false);

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

        setAnalysis(data);
      } catch (err) {
        console.error(
          "Failed to load Tesla charging data:",
          err
        );

        setError(true);
      }
    }

    loadTesla();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border-2 border-red-500 bg-black/40 p-6">
        <div className="text-sm uppercase tracking-[0.4em] text-red-400">
          Tesla Charging
        </div>

        <div className="mt-4 text-2xl font-bold text-red-300">
          DATA UNAVAILABLE
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">
        <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
          Tesla Charging
        </div>

        <div className="mt-4 text-lg text-cyan-300">
          Loading charging history...
        </div>
      </div>
    );
  }

  if (!analysis.available) {
    return (
      <div className="rounded-xl border-2 border-yellow-500 bg-black/40 p-6">
        <div className="text-sm uppercase tracking-[0.4em] text-yellow-400">
          Tesla Charging
        </div>

        <div className="mt-4 text-2xl font-bold text-yellow-300">
          NO CHARGING DATA
        </div>

        <div className="mt-3 text-sm text-cyan-300">
          Import Tesla charging history to enable EV analysis.
        </div>
      </div>
    );
  }

  const cycle = analysis.currentCycle;
  const latest = analysis.latestSession;

  const cycleHasOverlap =
    cycle.onPeakOverlapSessions > 0;

  const latestHasOverlap =
    latest !== null &&
    latest.onPeakOverlapMinutes > 0;

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">
      <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
        Tesla Charging
      </div>

      <div
        className={`mt-4 text-4xl font-bold ${
          cycleHasOverlap
            ? "text-yellow-300"
            : "text-green-400"
        }`}
      >
        {cycleHasOverlap
          ? "ON-PEAK OVERLAP DETECTED"
          : "OFF-PEAK"}
      </div>

      <div className="mt-2 text-sm text-cyan-300">
        APS billing cycle starting {analysis.cycleStart}
      </div>

      {/* CURRENT CYCLE */}

      <div className="mt-7 grid gap-6 md:grid-cols-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Sessions
          </div>

          <div className="mt-2 text-3xl font-bold text-orange-200">
            {cycle.sessions}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Energy
          </div>

          <div className="mt-2 text-3xl font-bold text-orange-200">
            {cycle.totalEnergyKwh.toFixed(1)} kWh
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            On-Peak Overlaps
          </div>

          <div
            className={`mt-2 text-3xl font-bold ${
              cycleHasOverlap
                ? "text-yellow-300"
                : "text-green-400"
            }`}
          >
            {cycle.onPeakOverlapSessions}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            On-Peak Minutes
          </div>

          <div
            className={`mt-2 text-3xl font-bold ${
              cycle.onPeakOverlapMinutes > 0
                ? "text-yellow-300"
                : "text-green-400"
            }`}
          >
            {cycle.onPeakOverlapMinutes}
          </div>
        </div>
      </div>

      {/* LATEST SESSION */}

      {latest && (
        <div className="mt-7 border-t border-cyan-800 pt-5">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">
            Latest Charging Session
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-500">
                Started
              </div>

              <div className="mt-2 text-lg text-orange-200">
                {formatDateTime(latest.startTime)}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-500">
                Duration
              </div>

              <div className="mt-2 text-lg text-orange-200">
                {formatDuration(
                  latest.durationMinutes
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-500">
                Energy
              </div>

              <div className="mt-2 text-lg text-orange-200">
                {latest.energyKwh.toFixed(1)} kWh
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-500">
                Avg Charge Rate
              </div>

              <div className="mt-2 text-lg text-orange-200">
                {latest.averageKw.toFixed(1)} kW
              </div>
            </div>
          </div>

          <div className="mt-5">
            {latestHasOverlap ? (
              <div className="rounded-lg border border-yellow-500/60 p-4">
                <div className="font-bold text-yellow-300">
                  APS ON-PEAK OVERLAP
                </div>

                <div className="mt-2 text-sm text-orange-200">
                  This session overlapped the APS 4–7 PM
                  window for{" "}
                  {latest.onPeakOverlapMinutes} minutes.
                  Estimated energy during that overlap:{" "}
                  {latest.estimatedOnPeakKwh.toFixed(2)} kWh.
                </div>

                <div className="mt-2 text-xs text-cyan-400">
                  On-peak energy is estimated from the
                  session&apos;s average charging rate because
                  Tesla&apos;s export does not provide
                  minute-by-minute charging power.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-500/60 p-4 text-green-400">
                ✓ Latest charging session remained outside
                the APS 4–7 PM demand window.
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY */}

      <div className="mt-7 border-t border-cyan-800 pt-5">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">
          Imported History
        </div>

        <div className="mt-4 text-sm text-cyan-300">
          {analysis.history.sessions} sessions •{" "}
          {analysis.history.totalEnergyKwh.toFixed(1)} kWh
          total • {analysis.history.offPeakSessions} fully
          off-peak •{" "}
          {analysis.history.onPeakOverlapSessions} with
          APS-window overlap
        </div>
      </div>
    </div>
  );
}