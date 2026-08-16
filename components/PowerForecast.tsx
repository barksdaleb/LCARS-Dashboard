import energy from "../data/energy.json";

function formatShortDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}





export default function PowerForecast() {
  const latestDemand = energy.energy.currentDemand;
  const dayPeak = energy.energy.dayPeakDemand;
  const dayPeakTime = energy.energy.dayPeakTime;

  const onPeakDemand = energy.energy.onPeakDemand;
  const onPeakTime = energy.energy.onPeakTime;

  const dataDate = energy.energy.dataDate;
const displayDate = formatShortDate(dataDate);
const lastReading = energy.energy.lastReading;

  return (
    <div className="rounded-xl border-2 border-orange-500 bg-black/40 p-8">

      <div className="text-3xl font-bold text-orange-300">
        POWER FORECAST
      </div>

      <div className="mt-8 space-y-6">

        <div>
          <div className="text-sm uppercase text-orange-500">
            Latest APS Demand
          </div>

          <div className="text-5xl font-bold text-cyan-300">
            {latestDemand.toFixed(2)} kW
          </div>
        </div>

        <div>
          <div className="text-sm uppercase text-orange-500">
            {displayDate} Day Peak
          </div>

          <div className="text-4xl font-bold text-orange-200">
            {dayPeak.toFixed(2)} kW
          </div>

          <div className="mt-1 text-cyan-300">
            @ {dayPeakTime}
          </div>
        </div>

        <div>
          <div className="text-sm uppercase text-orange-500">
            {displayDate} • APS 4–7 PM Peak
          </div>

          <div className="text-4xl font-bold text-cyan-300">
            {onPeakDemand.toFixed(2)} kW
          </div>

          <div className="mt-1 text-cyan-300">
            @ {onPeakTime}
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