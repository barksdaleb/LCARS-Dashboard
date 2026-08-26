interface DemandMeterProps {
  value: number;
  max: number;
}

export default function DemandMeter({
  value,
}: DemandMeterProps) {
  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">

      <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
        LATEST APS DEMAND
      </div>

      <div className="mt-5 text-center text-4xl font-semibold text-cyan-300">
        {value.toFixed(2)} kW
      </div>

      <div className="mt-3 text-center text-sm text-orange-300">
        Latest available APS hourly reading
      </div>

    </div>
  );
}