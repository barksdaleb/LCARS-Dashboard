"use client";

import { useState } from "react";

export default function UpdateButton() {
  const [scanning, setScanning] = useState(false);
  const [scanText, setScanText] = useState("🔄 UPDATE SHIP'S SENSORS");

  function runScan() {
    if (scanning) return;

    setScanning(true);

    // Start with weather
    setScanText("🌦️ SCANNING WEATHER...");

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();

      const start = new SpeechSynthesisUtterance(
        "Computer. Updating ship's sensors."
      );

      speechSynthesis.speak(start);
    }

    // APS
    setTimeout(() => {
      setScanText("⚡ SCANNING APS...");
    }, 1500);

    // Analysis
    setTimeout(() => {
      setScanText("🖖 COMPUTER ANALYSIS...");
    }, 3000);

    // Finish
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        const done = new SpeechSynthesisUtterance(
          "Captain, all systems are operating within normal parameters."
        );

        speechSynthesis.speak(done);
      }

      setScanning(false);
      setScanText("🔄 UPDATE SHIP'S SENSORS");
    }, 5000);
  }

  return (
    <button
      onClick={runScan}
      disabled={scanning}
      className="
        rounded-xl
        border-2
        border-orange-500
        bg-black/40
        px-8
        py-4
        text-lg
        font-bold
        tracking-[0.2em]
        text-orange-300
        transition
        hover:bg-orange-500/20
        hover:text-white
        disabled:opacity-70
      "
    >
      {scanText}
    </button>
  );
}