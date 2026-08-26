type CountermeasureStatusItem = {
  id: string;
  name: string;
  status: string;
  detail: string;
  evidence?: string;
  progress?: {
    current: number;
    target: number;
  };
};

const countermeasures: CountermeasureStatusItem[] = [
  {
    id: "weekday-house-precool",
    name: "Weekday House Pre-Cooling",
    status: "PROMISING",
    detail: "Shift HVAC cooling into the 2–4 PM off-peak window.",
    evidence: "4–7 PM runtime evidence is favorable.",
  },
  {
    id: "garage-peak-temperature",
    name: "Garage Mini-Split Peak Strategy",
    status: "COLLECTING DATA",
    detail: "100°F target during the 4–7 PM APS demand window.",
    evidence: "Financial and demand effect not yet isolated.",
  },
  {
    id: "front-sleep-72",
    name: "Front AC Sleep Temperature",
    status: "NEEDS ANALYSIS",
    detail: "Overnight target increased from 71°F to 72°F.",
    evidence: "Active since Aug 12.",
  },
  {
    id: "front-peak-75",
    name: "Front AC 75°F Peak Strategy",
    status: "PROMISING",
    detail: "75°F target during the 4–7 PM APS demand window.",
    evidence: "Peak cooling runtime has improved.",
  },
  {
    id: "front-peak-stagger",
    name: "Front AC Peak Stagger Strategy",
    status: "PROMISING",
    detail: "Front AC raised to 76°F from 5–6 PM.",
    evidence: "HVAC overlap reduced 37.4%.",
    progress: {
      current: 3,
      target: 5,
    },
  },
];

function statusColor(status: string) {
  switch (status) {
    case "PROMISING":
      return "text-green-400";

    case "COLLECTING DATA":
      return "text-cyan-300";

    case "NEEDS ANALYSIS":
      return "text-yellow-300";

    default:
      return "text-orange-200";
  }
}

export default function CountermeasureStatus() {
  return (
    <div className="rounded-xl border-2 border-cyan-500 bg-black/40 p-8">
      <div className="text-sm uppercase tracking-[0.4em] text-cyan-400">
        HOME OPS EXPERIMENT CONTROL
      </div>

      <div className="mt-2 text-4xl font-bold tracking-wide text-orange-100">
        ACTIVE COUNTERMEASURES
      </div>

      <div className="mt-2 text-lg text-cyan-300">
        Five active operating strategies under Home Ops evaluation.
      </div>

      <div className="mt-6 divide-y divide-cyan-900">
        {countermeasures.map((item) => (
          <div
            key={item.id}
            className="grid gap-4 py-5 md:grid-cols-[2fr_1fr_2fr]"
          >
            <div>
              <div className="text-xl font-semibold text-orange-100">
                {item.name}
              </div>

              <div className="mt-1 text-base text-orange-200">
                {item.detail}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-500">
                Status
              </div>

              <div
                className={`mt-1 text-lg font-bold ${statusColor(
                  item.status
                )}`}
              >
                {item.status}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-500">
                Evidence
              </div>

              <div className="mt-1 text-base text-cyan-200">
                {item.evidence}
              </div>

              {item.progress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-200">
                      Qualifying weekdays
                    </span>

                    <span className="font-bold text-green-400">
                      {item.progress.current} / {item.progress.target}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-cyan-950">
                    <div
                      className="h-full bg-cyan-400"
                      style={{
                        width: `${
                          (item.progress.current /
                            item.progress.target) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}