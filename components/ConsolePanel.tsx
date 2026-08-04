import Link from "next/link";

interface ConsolePanelProps {
  title: string;
  status?: string;
  value?: string;
  secondary?: string;
  footer?: string;
  href?: string;
  accent?: "orange" | "cyan" | "green" | "red";
}

export default function ConsolePanel({
  title,
  status,
  value,
  secondary,
  footer,
  href,
  accent = "orange",
}: ConsolePanelProps) {

  const borderColor = {
    orange: "border-orange-500 hover:border-orange-300",
    cyan: "border-cyan-500 hover:border-cyan-300",
    green: "border-green-500 hover:border-green-300",
    red: "border-red-500 hover:border-red-300",
  }[accent];

  const panel = (
    <div
      className={`
        rounded-xl
        border-2
        ${borderColor}
        bg-black/40
        p-8
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_0_25px_rgba(255,170,0,.25)]
      `}
    >

      <div className="text-3xl font-bold text-orange-200">
        {title}
      </div>

      {status && (
        <div className="mt-4 text-green-400 font-semibold tracking-wider">
          {status}
        </div>
      )}

      {value && (
        <div className="mt-6 text-5xl font-bold text-cyan-300">
          {value}
        </div>
      )}

      {secondary && (
        <div className="mt-3 text-xl text-orange-300">
          {secondary}
        </div>
      )}

      {footer && (
        <div className="mt-6 border-t border-orange-500 pt-4 text-orange-400">
          {footer}
        </div>
      )}

    </div>
  );

  if (!href) return panel;

  return <Link href={href}>{panel}</Link>;
}