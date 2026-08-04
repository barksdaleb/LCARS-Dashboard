"use client";

import energy from "../data/energy.json";
import { getAPSStatus } from "./lib/aps";
import { useEffect, useState } from "react";
import Link from "next/link";
import ConsolePanel from "../components/ConsolePanel";
import SystemStatusBar from "../components/SystemStatusBar";
import HomeStatus from "../components/HomeStatus";
import PowerForecast from "../components/PowerForecast";
import ComputerMessage from "../components/ComputerMessage";
import UpdateButton from "../components/UpdateButton";



export default function HomePage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // NEW: Use our APS logic library
  const aps = getAPSStatus(now);

  const day = now.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const date = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("en-US");

  return (
    <main className="min-h-screen bg-black text-orange-200 p-10">

      <div className="mx-auto max-w-7xl">
    
    <SystemStatusBar />
    <div className="mt-6 flex justify-end">
  <UpdateButton />
</div>

    <ComputerMessage />

    <div className="mt-8 grid gap-8 xl:grid-cols-2">

    <HomeStatus />

    <PowerForecast />

</div>

{/* Applications */}

        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

        <ConsolePanel
  title="⚡ BHEM"
  status="🟢 ONLINE"
  value={`${energy.energy.today.toFixed(2)} kWh`}
  secondary={`Current Demand ${energy.energy.currentDemand.toFixed(2)} kW`}
  footer={`Today's Peak ${energy.energy.dayPeakDemand.toFixed(2)} kW`}
  href="/bhem"
  accent="green"
/>



          <ConsolePanel
             title="🌡 Climate"
            status="🟢 ONLINE"
             value={`${energy.systems.weather.temperature}°`}
             secondary="Outside Temperature"
             footer="Ecobee Integration Next"
             accent="cyan"
            />

          <ConsolePanel
             title="🏊 Pool"
            status="OFFLINE"
            secondary="Coming Soon"
            accent="orange"
            />

        <ConsolePanel
         title="🚗 Vehicles"
         status="OFFLINE"
        secondary="Coming Soon"
         accent="orange"
        />

          <ConsolePanel
            title="📹 Security"
            status="ONLINE"
            secondary="Ring Integration"
            accent="green"
            />

        <ConsolePanel
            title="🖨 Maker Lab"
            status="READY"
            secondary="3D Printing"
            accent="cyan"
            />

        <ConsolePanel
            title="💰 Finance"
            status="ONLINE"
            secondary="Utility Monitoring"
            accent="green"      
            />

        <ConsolePanel
        title="⚙ System Status"
        status="NORMAL"
        secondary="All Systems Operational"
        accent="green"
        />

        </div>

      </div>

    </main>
  );
}