import energy from "../data/energy.json";
import DemandMeter from "./DemandMeter";
import { useEffect, useState } from "react";

export default function HomeStatus() {
  const latestDemand = energy.energy.currentDemand;

  const [now, setNow] = useState(new Date());

  const [outside, setOutside] = useState(
    energy.systems.weather.temperature
  );

  const [poolTemp, setPoolTemp] = useState(
    energy.systems.pool.temperature
  );

  useEffect(() => {
    async function loadData() {
      try {
        // Weather
        const weather = await fetch("/api/weather").then((r) => r.json());
        setOutside(Math.round(weather.outsideTemp));

        // Pool
        const pool = await fetch("/api/waterguru").then((r) => r.json());
        setPoolTemp(Math.round(pool.temperature));
      } catch (err) {
        console.error("Failed to load live status:", err);
      }
    }

    loadData();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);


  // APS demand window:
  // Monday-Friday, 4:00 PM through 6:59 PM
  const day = now.getDay();
  const hour = now.getHours();

  const isWeekday = day >= 1 && day <= 5;
  const isOnPeak =
    isWeekday &&
    hour >= 16 &&
    hour < 19;

  let houseStatus = "🟢 NORMAL";

  if (isOnPeak) {
    houseStatus = "🟡 APS ON-PEAK";
  }

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

      <div className="mt-8">
        <div className="text-orange-400 uppercase tracking-[0.3em]">
          Latest APS Demand
        </div>

        <DemandMeter
          value={latestDemand}
          max={10}
        />

        <div className="mt-2 text-sm text-cyan-300">
          APS data through {energy.energy.dataDate}{" "}
          {energy.energy.lastReading}
        </div>
      </div>

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