import energy from "../data/energy.json";

export default function PowerForecast() {
  const current = energy.energy.currentDemand;
  const peak = energy.energy.dayPeakDemand;
  const peakTime = energy.energy.dayPeakDemand;
  const dataDate = energy.energy.dataDate;
  const lastReading = energy.energy.lastReading;

  let risk = "LOW";
  let color = "text-green-400";

  if (peak > 8) {
    risk = "HIGH";
    color = "text-red-400";
  } else if (peak > 6) {
    risk = "MEDIUM";
    color = "text-yellow-300";
  }

  return (
    <div className="rounded-xl border-2 border-orange-500 bg-black/40 p-8">

      <div className="text-3xl font-bold text-orange-300">
        POWER FORECAST
      </div>

      <div className="mt-8 space-y-6">

        <div>
          <div className="text-sm uppercase text-orange-500">
            Current Demand
          </div>

          <div className="text-5xl font-bold text-cyan-300">
            {current.toFixed(2)} kW
          </div>
        </div>

       <div>
  <div className="text-sm uppercase text-orange-500">
    Today's Peak
  </div>

  <div className="text-4xl font-bold text-orange-200">
    {peak.toFixed(2)} kW
  </div>

 <div className="mt-1 text-cyan-300">
  @ {peakTime}
</div>
</div>

        <div>
  <div className="text-sm uppercase text-orange-500">
    APS Data Current Through
  </div>

  <div className="text-2xl font-bold text-cyan-300">
    {dataDate}
  </div>

  <div className="text-xl text-orange-300">
    {lastReading.trim()}
  </div>
</div>

      </div>

    </div>
  );
}