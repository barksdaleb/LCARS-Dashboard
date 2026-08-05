"use client";
import CaptainsLog from "@/components/CaptainsLog";
import APSStatus from "@/components/APSStatus";
import DemandMeter from "@/components/DemandMeter";
import { getAPSStatus } from "../lib/aps";
import { useState, useEffect } from "react";


export default function BHEMPage() {
  const [now, setNow] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);


  return () => clearInterval(timer);
}, []);

const aps = getAPSStatus(now);
const currentDemand = 7.8;
  return (
    <main className="min-h-screen bg-black p-8">

<div className="mb-8">
  <a
    href="/"
    className="text-cyan-400 hover:text-cyan-300 text-sm"
  >
    ← Back to Dashboard
  </a>

  <h1 className="mt-4 text-4xl font-bold text-orange-200">
    BARKSDALE HOME ENERGY MANAGER
  </h1>

  <p className="mt-2 text-cyan-300">
    Monitor APS demand, billing windows, and electrical usage.
  </p>
</div>

  <div className="space-y-8">
    <APSStatus />

    <DemandMeter
       value={currentDemand}
      max={15}
    />

    <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">

 <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
  <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
    Current
  </div>

  <div className="mt-2 text-3xl font-bold text-orange-200">
    {currentDemand.toFixed(2)} kW
  </div>
</div>

  <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
  <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
    Peak Today
  </div>

  <div className="mt-2 text-3xl font-bold text-orange-200">
    8.33 kW
  </div>
</div>

  <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5">
  <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
    Remaining
  </div>

  <div className="mt-2 text-3xl font-bold text-green-400">
    7.20 kW
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

    <CaptainsLog
  currentDemand={currentDemand}
  peakToday={8.33}
  apsStatus={aps.status}
/>
  </div>
</main>
  );
}