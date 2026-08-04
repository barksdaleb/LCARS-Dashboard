interface MetricCardProps {
  title: string;
  value: string;
  label?: string;
  accent?: "green" | "cyan" | "orange" | "red";
}

export default function MetricCard({
  title,
  value,
  label,
  accent = "cyan",
}: MetricCardProps) {
  const colors = {
    green: "text-green-400 border-green-500",
    cyan: "text-cyan-400 border-cyan-500",
    orange: "text-orange-300 border-orange-500",
    red: "text-red-400 border-red-500",
  };

  const color = colors[accent];

  return (
    <div className={`rounded-xl border-2 ${color} bg-black/40 p-6`}>
      <div className="text-sm uppercase tracking-[0.3em] opacity-70">
        {title}
      </div>

      <div className="mt-4 text-5xl font-bold">
        {value}
      </div>

      {label && (
        <div className="mt-3 text-lg opacity-75">
          {label}
        </div>
      )}
    </div>
  );
}