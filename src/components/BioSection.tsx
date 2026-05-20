"use client";

import { useState, useRef, useEffect } from "react";

const COLLAPSED_HEIGHT = 88; // ~4 linhas

export default function BioSection({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const innerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (innerRef.current) {
      setNeedsClamp(innerRef.current.scrollHeight > COLLAPSED_HEIGHT + 4);
    }
  }, [bio]);

  return (
    <section className="rounded-[20px] bg-white/[0.03] border border-white/[0.07] px-6 py-5">
      <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#C8A96B] mb-3">
        Sobre
      </h2>

      <div
        className="relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: expanded || !needsClamp ? "none" : COLLAPSED_HEIGHT }}
      >
        <p
          ref={innerRef}
          className="text-[14px] leading-[1.75] text-[#9CA3AF]"
        >
          {bio}
        </p>

        {/* fade gradient no bottom quando colapsado */}
        {needsClamp && !expanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, #161819)",
            }}
          />
        )}
      </div>

      {needsClamp && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] font-semibold text-[#C8A96B] hover:text-[#d4b87a] transition-colors focus:outline-none"
        >
          {expanded ? "Ver menos ↑" : "Ver mais ↓"}
        </button>
      )}
    </section>
  );
}
