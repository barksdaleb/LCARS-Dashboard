"use client";

import { useEffect, useState } from "react";
import { getAPSStatus } from "@/app/lib/apsBilling";

export default function SystemStatusBar() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

const aps = getAPSStatus(new Date());

  const day = mounted
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
      })
    : "";

  const date = mounted
    ? now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const time = mounted
    ? now.toLocaleTimeString("en-US")
    : "--:--:--";

  return (
    <div className="mb-10 rounded-xl border-2 border-orange-500 bg-black/40 p-6">

      <div className="flex items-start justify-between">

        <div>

          <div className="text-4xl font-bold tracking-[0.35em] text-orange-200">
            USS BARKSDALE COMPUTER
          </div>

          <div className="mt-2 text-cyan-300">
            Home Command Core
          </div>

        </div>

        <div className="text-right">

          <div
            className={`text-4xl font-bold ${
              aps.isPeak
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {aps.status}
          </div>

          <div className="text-orange-400">
            APS Status
          </div>

        </div>

      </div>

      <div className="mt-6 grid grid-cols-4 gap-8">

        <div>

          <div className="text-xs uppercase text-orange-500">
            DAY
          </div>

          <div className="text-xl">
            {day}
          </div>

        </div>

        <div>

          <div className="text-xs uppercase text-orange-500">
            DATE
          </div>

          <div className="text-xl">
            {date}
          </div>

        </div>

        <div>

          <div className="text-xs uppercase text-orange-500">
            TIME
          </div>

          <div className="text-xl text-cyan-300">
            {time}
          </div>

        </div>

        <div>

          <div className="text-xs uppercase text-orange-500">
            STATUS
          </div>

          <div className="text-xl text-green-300">
            ALL SYSTEMS ONLINE
          </div>

        </div>

      </div>

    </div>
  );
}