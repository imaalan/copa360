"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import PlayerPopup from "@/components/PlayerPopup";

type Player = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  photo: string | null;
  team: { id: number; name: string; tla: string | null; logo: string | null } | null;
};

type Team = { id: number; name: string; tla: string | null };

const POSITION_META: Record<string, { abbr: string; group: string }> = {
  Goalkeeper:           { abbr: "GR",  group: "Goleiro" },
  Defence:              { abbr: "DEF", group: "Defensor" },
  "Centre-Back":        { abbr: "ZAG", group: "Defensor" },
  "Left-Back":          { abbr: "LE",  group: "Defensor" },
  "Right-Back":         { abbr: "LD",  group: "Defensor" },
  Midfield:             { abbr: "MEI", group: "Meia" },
  "Defensive Midfield": { abbr: "VOL", group: "Meia" },
  "Central Midfield":   { abbr: "MEI", group: "Meia" },
  "Attacking Midfield": { abbr: "MAI", group: "Meia" },
  Offence:              { abbr: "ATA", group: "Atacante" },
  "Left Winger":        { abbr: "PE",  group: "Atacante" },
  "Right Winger":       { abbr: "PD",  group: "Atacante" },
  "Centre-Forward":     { abbr: "CA",  group: "Atacante" },
  "Secondary Striker":  { abbr: "SA",  group: "Atacante" },
};

const POSITION_GROUPS = ["Todos", "Goleiro", "Defensor", "Meia", "Atacante"];

function getMeta(position: string | null) {
  if (!position) return { abbr: "—", group: "Outro" };
  return POSITION_META[position] ?? { abbr: position.slice(0, 3).toUpperCase(), group: "Outro" };
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - new Date(dob).getFullYear();
  const m = today.getMonth() - new Date(dob).getMonth();
  if (m < 0 || (m === 0 && today.getDate() < new Date(dob).getDate())) age--;
  return age;
}

const PAGE_SIZE = 60;

export default function PlayersGrid({ players, teams }: { players: Player[]; teams: Team[] }) {
  const [query, setQuery]       = useState("");
  const [posFilter, setPosFilter] = useState("Todos");
  const [teamFilter, setTeamFilter] = useState("all");
  const [page, setPage]         = useState(1);
  const [popupId, setPopupId]   = useState<number | null>(null);
  const [popupName, setPopupName] = useState("");
  const [popupPhoto, setPopupPhoto] = useState<string | null>(null);

  function openPopup(p: Player) {
    setPopupId(p.id);
    setPopupName(p.name);
    setPopupPhoto(p.photo);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return players.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.nationality?.toLowerCase().includes(q)) return false;
      if (posFilter !== "Todos" && getMeta(p.position).group !== posFilter) return false;
      if (teamFilter !== "all" && String(p.team?.id) !== teamFilter) return false;
      return true;
    });
  }, [players, query, posFilter, teamFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() { setPage(1); }

  return (
    <>
      {popupId !== null && (
        <PlayerPopup
          playerId={popupId}
          playerName={popupName}
          playerPhoto={popupPhoto}
          onClose={() => setPopupId(null)}
        />
      )}

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder="Buscar jogador..."
            className="h-[44px] w-[220px] pl-9 pr-4 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#C8A96B]/30 transition-colors"
          />
        </div>

        {/* Position filter */}
        <div className="flex gap-1.5">
          {POSITION_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => { setPosFilter(g); resetPage(); }}
              className={`h-[44px] px-4 rounded-[14px] text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors ${
                posFilter === g
                  ? "bg-[#C8A96B] text-[#111315]"
                  : "bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Team filter */}
        <select
          value={teamFilter}
          onChange={(e) => { setTeamFilter(e.target.value); resetPage(); }}
          className="h-[44px] px-4 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-[#6B7280] outline-none focus:border-[#C8A96B]/30 transition-colors cursor-pointer"
        >
          <option value="all">Todas as seleções</option>
          {teams.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.tla} · {t.name}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-[11px] text-[#6B7280]">
          {filtered.length} jogador{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {paginated.map((player) => (
              <PlayerCard key={player.id} player={player} onOpen={() => openPopup(player)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 px-4 rounded-[10px] text-[11px] font-semibold bg-white/[0.04] border border-white/[0.08] text-[#6B7280] disabled:opacity-30 hover:enabled:text-[#F3F4F6] transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-[11px] text-[#6B7280] px-3">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-4 rounded-[10px] text-[11px] font-semibold bg-white/[0.04] border border-white/[0.08] text-[#6B7280] disabled:opacity-30 hover:enabled:text-[#F3F4F6] transition-colors"
              >
                Próximo →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-24 text-center text-[#6B7280] text-[13px]">
          Nenhum jogador encontrado.
        </div>
      )}
    </>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function PlayerCard({ player, onOpen }: { player: Player; onOpen: () => void }) {
  const { abbr } = getMeta(player.position);
  const age      = calcAge(player.dateOfBirth);
  const slug     = player.team?.tla?.toLowerCase();
  const [imgError, setImgError] = useState(false);
  const handleImgError = useCallback(() => setImgError(true), []);

  return (
    <button
      onClick={onOpen}
      className="group relative bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-4 hover:border-[#C8A96B]/25 transition-all duration-200 text-left w-full"
    >
      {/* Gold top accent */}
      <div className="absolute top-0 left-[20%] right-[20%] h-px bg-[#C8A96B] opacity-0 group-hover:opacity-60 transition-opacity rounded-full" />

      {/* Top row: position badge + team crest */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] flex items-center justify-center">
          <span className="text-[9px] font-extrabold tracking-[0.04em] text-[#C8A96B]">{abbr}</span>
        </div>
        {player.team?.logo && slug && (
          <Link href={`/teams/${slug}`} className="opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Image src={player.team.logo} alt={player.team.name} width={28} height={28} className="object-contain" unoptimized />
          </Link>
        )}
      </div>

      {/* Photo */}
      <div className="aspect-square rounded-[12px] bg-white/[0.05] overflow-hidden flex items-center justify-center mb-3">
        {player.photo && !imgError ? (
          <Image
            src={player.photo}
            alt={player.name}
            width={200}
            height={200}
            className="object-cover w-full h-full"
            unoptimized
            onError={handleImgError}
          />
        ) : (
          <span className="text-[24px] font-extrabold text-white/20 tracking-[-0.04em]">
            {getInitials(player.name)}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="text-[13px] font-bold tracking-[-0.01em] text-[#F3F4F6] truncate leading-tight mb-0.5">
        {player.name}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#6B7280]">
          {player.team?.tla ?? "—"}
        </span>
        {age !== null && (
          <span className="text-[10px] text-[#6B7280]">{age} anos</span>
        )}
      </div>
    </button>
  );
}
