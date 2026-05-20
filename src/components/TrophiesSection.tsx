"use client";

import { useState } from "react";

type Trophy = { league: string; country: string; season: string; place: string };

const PREVIEW = 3;

export default function TrophiesSection({ trophies }: { trophies: Trophy[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? trophies : trophies.slice(0, PREVIEW);
  const hidden = trophies.length - PREVIEW;

  return (
    <div className="mb-6 rounded-[20px] bg-white/[0.03] border border-white/[0.07] p-6">
      <p className="mb-4 text-[9px] font-bold tracking-[0.3em] uppercase text-white/50">
        Conquistas ({trophies.length})
      </p>

      <div className="grid gap-2">
        {visible.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[12px] bg-white/[0.02] border border-white/[0.05] px-4 py-3"
          >
            <span className="text-[16px] flex-shrink-0">🏆</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#F3F4F6] truncate">{t.league}</div>
              <div className="text-[11px] text-[#6B7280]">{t.country} · {t.season}</div>
            </div>
          </div>
        ))}
      </div>

      {trophies.length > PREVIEW && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] font-semibold text-[#C8A96B] hover:text-[#d4b87a] transition-colors focus:outline-none"
        >
          {expanded ? "Ver menos ↑" : `Ver mais ${hidden} conquistas ↓`}
        </button>
      )}
    </div>
  );
}
