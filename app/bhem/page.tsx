"use client";

import energy from "../../data/energy.json";
import CaptainsLog from "@/components/CaptainsLog";
import APSStatus from "@/components/APSStatus";
import DemandMeter from "@/components/DemandMeter";
import { getAPSStatus } from "../lib/aps";
import { useState, useEffect, type ComponentProps } from "react";
import Link from "next/link";
import HVACStrategy from "@/components/HVACStrategy";
import SavingsProof from "@/components/SavingsProof";
import APSBillHistory from "@/components/APSBillHistory";
import CountermeasureStatus from "@/components/CountermeasureStatus";
import TeslaCharging from "@/components/TeslaCharging";

export default function BHEMPage() {
  const [now, setNow] = useState(new Date());

  const [, setPool] = useState<unknown>(null);

  const [hvacStrategy, setHvacStrategy] =
    useState<ComponentProps<typeof CaptainsLog>["hvacStrategy"]>(null);

  const [savingsProof, setSavingsProof] =
    useState<ComponentProps<typeof CaptainsLog>["savingsProof"]>(null);

  // -------------------------------------------------------
  // CLOCK
  // -------------------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------
  // WATERGURU
  // -------------------------------------------------------

  useEffect(() => {
    async function loadPool() {
      try {
        const response = await fetch("/api/waterguru");
        const data = await response.json();

        setPool(data);
      } catch (err) {
        console.error("Failed to load pool data:", err);
      }
    }

    loadPool();
  }, []);

  // -------------------------------------------------------
  // ECOBEE / HVAC STRATEGY
  // -------------------------------------------------------

  useEffect(() => {
    async function loadHVACStrategy() {
      try {
        const response = await fetch("/api/ecobee/strategy");

        if (!response.ok) {
          throw new Error("HVAC strategy request failed");
        }

        const data = await response.json();

        setHvacStrategy(data);
      } catch (err) {
        console.error("Failed to load HVAC strategy:", err);
      }
    }

    loadHVACStrategy();
  }, []);

  // -------------------------------------------------------
  // APS SAVINGS PROOF
  // -------------------------------------------------------

  useEffect(() => {
    async function loadSavingsProof() {
      try {
        const response = await fetch("/api/aps/savings");

        if (!response.ok) {
          throw new Error("Savings proof request failed");
        }

        const data = await response.json();

        setSavingsProof(data);
      } catch (err) {
        console.error("Failed to load savings proof:", err);
      }
    }

    loadSavingsProof();
  }, []);

  // -------------------------------------------------------
  // APS STATUS
  // -------------------------------------------------------

  const aps = getAPSStatus(now);

  // -------------------------------------------------------
  // APS SMART-METER DATA
  // -------------------------------------------------------

  const currentDemand = energy.energy.currentDemand;

  const onPeakDemand = energy.energy.onPeakDemand;
  const onPeakTime = energy.energy.onPeakTime;

  const cyclePeakDemand = energy.energy.currentCyclePeakDemand;
  const cyclePeakDate = energy.energy.currentCyclePeakDate;
  const cyclePeakTime = energy.energy.currentCyclePeakTime;
  const cycleStart = energy.energy.currentCycleStart;

  const dataDate = energy.energy.dataDate;
  const lastReading = energy.energy.lastReading;

  // -------------------------------------------------------
  // DATA FRESHNESS
  //
  // APS hourly data is not treated as live telemetry.
  // If the imported APS date is not today's local date,
  // current load/headroom is considered unknown.
  // -------------------------------------------------------

  const localToday =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  const apsDataIsCurrentDay = dataDate === localToday;

  // -------------------------------------------------------
  // PEAK PROTECTION
  // -------------------------------------------------------

  let protectionStatus = "MONITORING";
  let protectionColor = "text-cyan-300";
  let protectionMessage =
    "Current-cycle APS demand peak is being monitored.";

  if (!aps.isPeak) {
    protectionStatus = "OFF PEAK";
    protectionColor = "text-green-400";
    protectionMessage =
      "APS demand window is closed. New demand charges are not being set right now.";
  } else if (!apsDataIsCurrentDay) {
    protectionStatus = "DATA DELAY";
    protectionColor = "text-yellow-300";
    protectionMessage =
      "APS has not published today's hourly demand yet. Live demand headroom is unknown, so avoid assuming additional on-peak load is safe.";
  } else {
    protectionStatus = "ACTIVE";
    protectionColor = "text-green-400";
    protectionMessage =
      "APS demand window is active and today's APS data is available.";
  }

  // Only calculate headroom when the APS reading is from today.
  const demandHeadroom = apsDataIsCurrentDay
    ? Math.max(cyclePeakDemand - currentDemand, 0)
    : null;

  // -------------------------------------------------------
  // PAGE
  // -------------------------------------------------------

  return (
    <main className="min-h-screen bg-black p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-bold text-orange-200">
          BARKSDALE HOME ENERGY MANAGER
        </h1>

        <p className="mt-2 text-cyan-300">
          Monitor APS demand, billing windows, and electrical usage.
        </p>
      </div>

      <div className="space-y-8">
        <APSStatus />

        <APSBillHistory />

        <SavingsProof />

        <DemandMeter value={currentDemand} max={15} />

        {/* ------------------------------------------------
            APS DEMAND STATUS
        ------------------------------------------------ */}

        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
              Latest Demand
            </div>

            <div className="mt-2 text-3xl font-bold text-orange-200">
              {currentDemand.toFixed(2)} kW
            </div>

            <div className="mt-1 text-xs text-cyan-300">
              {dataDate} • {lastReading}
            </div>
          </div>

          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
              Cycle APS Peak
            </div>

            <div className="mt-2 text-3xl font-bold text-orange-200">
              {cyclePeakDemand.toFixed(2)} kW
            </div>

            <div className="mt-1 text-xs text-cyan-300">
              {cyclePeakDate} • {cyclePeakTime}
            </div>
          </div>

          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
              Latest Day APS Peak
            </div>

            <div className="mt-2 text-3xl font-bold text-green-400">
              {onPeakDemand.toFixed(2)} kW
            </div>

            <div className="mt-1 text-xs text-cyan-300">
              {dataDate} • {onPeakTime}
            </div>
          </div>

          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
              APS Window
            </div>

            <div className={`mt-2 text-3xl font-bold ${aps.color}`}>
              {aps.status}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------
            APS PEAK PROTECTION
        ------------------------------------------------ */}

        <div className="rounded-xl border-2 border-orange-500 bg-black/40 p-6">
          <div className="text-sm uppercase tracking-[0.4em] text-orange-400">
            APS Peak Protection
          </div>

          <div
            className={`mt-4 text-4xl font-bold ${protectionColor}`}
          >
            {protectionStatus}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
                Cycle Peak
              </div>

              <div className="mt-2 text-3xl font-bold text-orange-200">
                {cyclePeakDemand.toFixed(2)} kW
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
                Demand Headroom
              </div>

              <div className="mt-2 text-3xl font-bold text-cyan-300">
                {demandHeadroom === null
                  ? "UNKNOWN"
                  : `${demandHeadroom.toFixed(2)} kW`}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">
                APS Data
              </div>

              <div
                className={`mt-2 text-3xl font-bold ${
                  apsDataIsCurrentDay
                    ? "text-green-400"
                    : "text-yellow-300"
                }`}
              >
                {apsDataIsCurrentDay ? "CURRENT" : "DELAYED"}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-cyan-800 pt-5">
            <div className="text-lg text-orange-200">
              {protectionMessage}
            </div>

            <div className="mt-3 text-sm text-cyan-300">
              Billing cycle started {cycleStart}. Latest APS smart-meter
              data: {dataDate} at {lastReading}.
            </div>
          </div>
        </div>

        <HVACStrategy />

      <CountermeasureStatus />

<TeslaCharging />

<CaptainsLog
          currentDemand={currentDemand}
          peakToday={onPeakDemand}
          apsStatus={aps.status}
          hvacStrategy={hvacStrategy}
          savingsProof={savingsProof}
        />
      </div>
    </main>
  );
}