import { getAIRecommendation } from "@/app/lib/ai";

export default function ComputerMessage() {
  const ai = getAIRecommendation();

  return (
    <div className="mt-8 rounded-xl border-2 border-orange-500 bg-black/40 p-6">

      <div className="text-sm uppercase tracking-[0.35em] text-orange-400">
        Computer
      </div>

      <div className="mt-4 text-3xl font-bold text-cyan-300">
        {ai.title}
      </div>

      <div className="mt-4 text-xl text-orange-200 leading-relaxed">
        {ai.message}
      </div>

    </div>
  );
}