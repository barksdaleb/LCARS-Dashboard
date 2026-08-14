import energy from "../data/energy.json";
import DemandMeter from "./DemandMeter";
import { getAIRecommendation } from "@/app/lib/ai";
import { useEffect, useState } from "react";

export default function HomeStatus() {
  const demand = energy.energy.currentDemand;

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
  }, []);

  const ai = getAIRecommendation();

  let houseStatus = "🟢 NORMAL";

  if (demand > 8) {
    houseStatus = "🔴 HIGH DEMAND";
  } else if (demand > 6) {
    houseStatus = "🟡 ELEVATED";
  }

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-8">

      <div className="text-3xl font-bold text-cyan-300">
        HOME STATUS
      </div>

      <div className="mt-6 text-4xl font-bold text-green-400">
        {houseStatus}
      </div>

      <div className="mt-8">
        <div className="text-orange-400 uppercase tracking-[0.3em]">
          Current Demand
        </div>

        <DemandMeter
          value={demand}
          max={10}
        />
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
            ai.level === "warning"
              ? "text-red-400"
              : ai.level === "info"
              ? "text-yellow-300"
              : "text-green-400"
          }`}
        >
          {ai.title}
        </div>

        <div className="mt-3 text-orange-200">
          {ai.message}
        </div>

      </div>

    </div>
  );
}