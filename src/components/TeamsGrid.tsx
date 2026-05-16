"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

type Team = {
  id: number;
  name: string;
  tla: string | null;
  logo: string | null;
  country: string | null;
  founded: number | null;
  venue: string | null;
  _count: { players: number };
};

export default function TeamsGrid({ teams }: { teams: Team[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.country?.toLowerCase().includes(q) ||
        t.tla?.toLowerCase().includes(q)
    );
  }, [query, teams]);

  return (
    <>
      {/* Search */}
      <div className="mb-8 relative max-w-[400px]">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar seleção..."
          className="w-full h-[48px] pl-10 pr-4 rounded-[16px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#C8A96B]/30 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F3F4F6] transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Count feedback */}
      {query && (
        <p className="mb-5 text-[11px] text-[#6B7280]">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {filtered.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-[#6B7280] text-[13px]">
          Nenhuma seleção encontrada.
        </div>
      )}
    </>
  );
}

function TeamCard({ team }: { team: Team }) {
  const slug = team.tla?.toLowerCase() ?? team.id.toString();

  return (
    <Link href={`/teams/${slug}`} className="group block no-underline">
      <div className="relative bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-5 flex flex-col items-center text-center cursor-pointer hover:border-[#C8A96B]/30 hover:bg-white/[0.05] transition-all duration-200">
        {/* Gold top accent on hover */}
        <div className="absolute top-0 left-[25%] right-[25%] h-px bg-[#C8A96B] opacity-0 group-hover:opacity-70 transition-opacity" />

        {/* Logo */}
        <div className="w-14 h-14 mb-3 flex items-center justify-center">
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.name}
              width={56}
              height={56}
              className="object-contain drop-shadow-sm"
              unoptimized
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-[#6B7280]">
              {team.tla}
            </div>
          )}
        </div>

        {/* TLA */}
        <div className="text-[11px] font-extrabold tracking-[0.08em] text-[#C8A96B] mb-0.5">
          {team.tla}
        </div>

        {/* Name */}
        <div className="text-[12px] font-semibold text-[#F3F4F6] leading-tight mb-2">
          {team.name}
        </div>

        {/* Player count */}
        <div className="text-[10px] text-[#6B7280]">
          {team._count.players} jogadores
        </div>
      </div>
    </Link>
  );
}
