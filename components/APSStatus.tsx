import { getAPSStatus } from "@/app/lib/aps";

export default function APSStatus() {
  const aps = getAPSStatus(new Date());

  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-6">

      <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
        APS STATUS
      </div>

      <div className={`mt-4 text-3xl font-bold ${aps.color}`}>
        {aps.status}
      </div>

      <div className="mt-2 text-lg text-orange-300">
        Next Change: {aps.nextChange}
      </div>

    </div>
  );
}