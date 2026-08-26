import energy from "../data/energy.json";
import bills from "../data/history/aps/bills.json";
import { useEffect, useState } from "react";

export default function HomeStatus() {
  const [now, setNow] = useState(new Date());

  const [outside, setOutside] = useState(
    energy.systems.weather.temperature
  );

  const [poolTemp, setPoolTemp] = useState(
    energy.systems.pool.temperature
  );

  // ------------------------------------------------------
  // Latest official APS bill
  // ------------------------------------------------------

  const latestBill =
    bills.bills.length > 0
      ? bills.bills[bills.bills.length - 1]
      : null;

  const lastBillPeak =
    latestBill?.peakDemandKW ?? null;

  const lastBillPeakDate =
    latestBill?.peakDemandDate ?? null;

  const lastBillPeakWindow =
    latestBill?.peakDemandWindow ?? null;

  // ------------------------------------------------------
  // Current billing-cycle tracking
  // ------------------------------------------------------

  const currentCycleStart =
    energy.energy.currentCycleStart;

  const currentCyclePeak =
    energy.energy.currentCyclePeakDemand;

  const currentCyclePeakDate =
    energy.energy.currentCyclePeakDate;

  const currentCyclePeakTime =
    energy.energy.currentCyclePeakTime;

  const hasCurrentCyclePeak =
    currentCyclePeak > 0;

  useEffect(() => {
    async function loadData() {
      try {
        // Weather
        const weather = await fetch("/api/weather").then(
          (r) => r.json()
        );

        setOutside(
          Math.round(weather.outsideTemp)
        );

        // Pool
        const pool = await fetch("/api/waterguru").then(
          (r) => r.json()
        );

        setPoolTemp(
          Math.round(pool.temperature)
        );
      } catch (err) {
        console.error(
          "Failed to load live status:",
          err
        );
      }
    }

    loadData();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ------------------------------------------------------
  // APS demand window
  // Monday-Friday, 4:00 PM through 6:59 PM
  // ------------------------------------------------------

  const day = now.getDay();
  const hour = now.getHours();

  const isWeekday =
    day >= 1 && day <= 5;

  const isOnPeak =
    isWeekday &&
    hour >= 16 &&
    hour < 19;

  const houseStatus =
    isOnPeak
      ? "🟡 APS ON-PEAK"
      : "🟢 NORMAL";

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-8">

      <div className="text-3xl font-bold text-cyan-300">
        HOME STATUS
      </div>

      <div
        className={`mt-6 text-4xl font-bold ${
          isOnPeak
            ? "text-yellow-300"
            : "text-green-400"
        }`}
      >
        {houseStatus}
      </div>

      {/* Demand intelligence */}

      <div className="mt-8">

        <div className="text-orange-400 uppercase tracking-[0.3em]">
          APS Demand Intelligence
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">

          {/* Last official bill */}

          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">

            <div className="text-center text-sm uppercase tracking-wider text-orange-300">
              Last Bill Peak
            </div>

            <div className="mt-3 text-center text-3xl font-semibold text-cyan-300">
              {lastBillPeak !== null
                ? `${lastBillPeak.toFixed(2)} kW`
                : "--"}
            </div>

            <div className="mt-3 text-center text-sm text-orange-200">
              Official APS Bill
            </div>

            <div className="mt-1 text-center text-sm text-cyan-300">
              {lastBillPeakDate ?? "--"}
              {lastBillPeakWindow
                ? ` • ${lastBillPeakWindow}`
                : ""}
            </div>

          </div>

          {/* Current cycle */}

          <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">

            <div className="text-center text-sm uppercase tracking-wider text-orange-300">
              Current Cycle Peak
            </div>

            <div className="mt-3 text-center text-3xl font-semibold text-cyan-300">
              {hasCurrentCyclePeak
                ? `${currentCyclePeak.toFixed(2)} kW`
                : "PENDING"}
            </div>

            <div className="mt-3 text-center text-sm text-orange-200">
              Home Ops Tracking
            </div>

            <div className="mt-1 text-center text-sm text-cyan-300">
              {hasCurrentCyclePeak
                ? `${currentCyclePeakDate} • ${currentCyclePeakTime}`
                : `Cycle started ${currentCycleStart}`}
            </div>

          </div>

        </div>

        <div className="mt-2 text-sm text-cyan-300">
          APS usage data through{" "}
          {energy.energy.dataDate}{" "}
          {energy.energy.lastReading}
        </div>

      </div>

      {/* Temperatures */}

      <div className="mt-10 grid grid-cols-2 gap-8">

        <div>
          <div className="text-sm uppercase text-orange-500">
            Outside
          </div>

          <div className="text-5xl font-bold text-cyan-300">
            {outside}°
          </div>
        </div>

        <div>
          <div className="text-sm uppercase text-orange-500">
            Pool
          </div>

          <div className="text-5xl font-bold text-cyan-300">
            {poolTemp}°
          </div>
        </div>

      </div>

      {/* Computer analysis */}

      <div className="mt-10 border-t border-cyan-700 pt-6">

        <div className="text-sm uppercase tracking-[0.3em] text-orange-500">
          Computer Analysis
        </div>

        <div
          className={`mt-3 text-2xl font-bold ${
            isOnPeak
              ? "text-yellow-300"
              : "text-green-400"
          }`}
        >
          {isOnPeak
            ? "APS ON-PEAK ACTIVE"
            : "SYSTEM OPTIMAL"}
        </div>

        <div className="mt-3 text-orange-200">
          {isOnPeak
            ? "Minimize discretionary high-power loads until 7 PM."
            : "No action required. Home systems are operating normally."}
        </div>

      </div>

    </div>
  );
}