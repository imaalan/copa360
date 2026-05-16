"use client";

import { useEffect, useState } from "react";

const TARGET = new Date("2026-06-19T18:00:00Z");
const pad = (n: number) => String(n).padStart(2, "0");

type TimeLeft = { d: string; h: string; m: string; s: string } | null;

function calc(): TimeLeft {
  const delta = TARGET.getTime() - Date.now();
  if (delta <= 0) return null;
  return {
    d: pad(Math.floor(delta / 86400000)),
    h: pad(Math.floor((delta % 86400000) / 3600000)),
    m: pad(Math.floor((delta % 3600000) / 60000)),
    s: pad(Math.floor((delta % 60000) / 1000)),
  };
}

const UNITS = [
  { key: "d", label: "Dias" },
  { key: "h", label: "Horas" },
  { key: "m", label: "Minutos" },
  { key: "s", label: "Segundos" },
] as const;

export default function CountdownTimer() {
  const [time, setTime] = useState<TimeLeft>(null);

  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="grid grid-cols-4 gap-2.5 max-w-[640px]">
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className="relative bg-white/[0.03] border border-white/[0.07] rounded-[20px] px-4 pt-6 pb-4 text-center overflow-hidden"
        >
          {/* Gold accent line */}
          <div className="absolute top-0 left-[20%] right-[20%] h-px bg-[#C8A96B] opacity-80" />
          <div
            className="text-[#F3F4F6] font-extrabold tabular-nums leading-none tracking-[-0.04em]"
            style={{ fontSize: "clamp(38px, 5.5vw, 60px)" }}
          >
            {time[key]}
          </div>
          <div className="mt-2 text-[9px] font-semibold tracking-[0.28em] uppercase text-[#6B7280]">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
