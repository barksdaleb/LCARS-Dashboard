import energy from "@/data/energy.json";

type CaptainsLogProps = {
  currentDemand: number;
  peakToday: number;
  apsStatus: string;
};

export default function CaptainsLog({
  currentDemand,
  peakToday,
  apsStatus,
}: CaptainsLogProps) {

  const ai = energy.ai;

let headline = ai.headline;
let summary = ai.summary;
let recommendation = ai.recommendation;

if (apsStatus === "ON PEAK") {
  headline = "HIGH DEMAND WINDOW ACTIVE";

  summary =
    "Engineering recommends minimizing large electrical loads until APS demand pricing ends.";

  recommendation =
    "Delay EV charging, pool equipment, laundry, and other high-power devices.";
}
if (currentDemand < 3) {
  headline = "SYSTEMS OPERATING NORMALLY";

  summary =
    "Electrical demand remains well below operational limits. All monitored systems are functioning within expected parameters.";

  recommendation =
    "No action required. Continue normal operation.";
}


  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-8">

      <div className="text-sm tracking-[0.4em] uppercase text-cyan-400">
        CAPTAIN'S LOG
      </div>

      <div className="mt-2 flex items-center justify-between">

  <h2 className="text-4xl font-bold text-orange-100 tracking-wide">
    {ai.title}
  </h2>

  <div className="rounded-full border border-cyan-500 bg-cyan-950/40 px-4 py-1 text-cyan-300">
    AI Confidence {ai.confidence}%
  </div>

</div>

      <div className="mt-6 space-y-6">

        <div className="text-2xl font-semibold text-cyan-300">
          {headline}
        </div>

<div className="text-xl leading-8 text-orange-300 border-l-4 border-cyan-500 pl-5">
  {summary}
</div>

<div className="border-t border-cyan-700 pt-6">

  <div className="mb-4 text-sm uppercase tracking-[0.3em] text-cyan-400">
    Observations
  </div>

  <div className="space-y-3">

    {ai.observations.map((item, index) => (
            <div key={index} className="flex items-start gap-3">

              <div
                className={
                  item.status === "success"
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              >
                {item.status === "success" ? "✓" : "⚠"}
              </div>

              <div className="text-lg text-orange-200">
                {item.text}
              </div>

            </div>

        
          ))}

        </div>
        </div>

        <div className="border-t border-cyan-700 pt-5">

          <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            RECOMMENDED ACTION
          </div>

          <div className="mt-2 text-xl text-cyan-300">
            {recommendation}
          </div>

        </div>

        <div className="border-t border-cyan-700 pt-5">

          <div className="mt-4 grid grid-cols-2 gap-2">

            {ai.sources.map((source, index) => (
              <div
                key={index}
                className={`text-sm ${
                  source.status === "online"
                    ? "text-green-400"
                    : source.status === "partial"
                    ? "text-orange-300"
                    : "text-yellow-400"
                }`}
              >
                {source.status === "online"
                  ? "✓"
                  : source.status === "partial"
                  ? "◐"
                  : "○"}{" "}
                {source.name}
              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}