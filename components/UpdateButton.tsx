"use client";

export default function UpdateButton() {
  return (
    <button
      className="
        rounded-xl
        border-2
        border-orange-500
        bg-black/40
        px-8
        py-4
        text-lg
        font-bold
        tracking-[0.2em]
        text-orange-300
        transition
        hover:bg-orange-500/20
        hover:text-white
      "
    >
      🔄 UPDATE SHIP'S SENSORS
    </button>
  );
}