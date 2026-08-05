interface DemandMeterProps {
  value: number;
  max: number;
}

export default function DemandMeter({
  value,
  max,
}: DemandMeterProps) {
  const percent = Math.min((value / max) * 100, 100);

  let color = "bg-green-500";

  if (percent > 60) color = "bg-yellow-400";
  if (percent > 85) color = "bg-red-500";

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">

      <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
  CURRENT DEMAND
  </div>

      <div className="mb-2 flex justify-between text-sm text-orange-300">
        <span>0 kW</span>
        <span>{max.toFixed(1)} kW</span>
      </div>

      <div className="h-5 w-full overflow-hidden rounded-full border border-orange-500 bg-black">

        <div
          className={`${color} h-full transition-all duration-700`}
          style={{
            width: `${percent}%`,
          }}
        />

      </div>

      <div className="mt-3 text-center text-lg font-semibold text-cyan-300">
        {value.toFixed(2)} kW
      </div>

    </div>
  );
}