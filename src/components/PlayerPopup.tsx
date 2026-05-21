"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPosition } from "@/lib/positions";
import BioSection from "@/components/BioSection";
import TrophiesSection from "@/components/TrophiesSection";

type AFStats = {
  goals: { total: number | null; assists: number | null };
  games: { appearences: number | null; lineups: number | null; minutes: number | null; rating: string | null };
  cards: { yellow: number | null; red: number | null };
  passes: { total: number | null; key: number | null; accuracy: number | null };
  dribbles: { attempts: number | null; success: number | null };
};

type Trophy = { league: string; country: string; season: string; place: string };

type PopupData = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  shirtNumber: number | null;
  photo: string | null;
  bio: string | null;
  team: { id: number; tla: string | null; name: string; logo: string | null } | null;
  currentClub: { name: string; logo: string | null } | null;
  stats: AFStats | null;
  trophies: Trophy[];
};


function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}


type PlayerPopupProps = {
  playerId: number | null;
  playerName: string;
  playerPhoto: string | null;
  onClose: () => void;
};

export default function PlayerPopup({ playerId, playerName, playerPhoto, onClose }: PlayerPopupProps) {
  const [data, setData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const close = useCallback(() => {
    setData(null);
    onClose();
  }, [onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const atTop = !scrollRef.current || scrollRef.current.scrollTop === 0;
    if (dy > 72 && atTop) close();
  }, [close]);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setData(null);
    setPhotoError(false);
    fetch(`/api/players/${playerId}/popup`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [playerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  const d = data;
  const { abbr, pt: label } = getPosition(d?.position ?? null);
  const age = calcAge(d?.dateOfBirth ?? null);
  const photo = photoError ? null : (d?.photo ?? playerPhoto);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div
        className="popup-modal relative w-full md:max-w-[680px] rounded-t-[28px] md:rounded-[28px] bg-[#13161C] border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close (desktop only) */}
        <button
          onClick={close}
          className="hidden md:flex absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.10] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* TLA watermark */}
        {d?.team?.tla && (
          <div
            className="absolute right-0 top-0 font-extrabold text-white/[0.03] leading-none tracking-[-0.06em] select-none pointer-events-none"
            style={{ fontSize: 160 }}
          >
            {d.team.tla}
          </div>
        )}

        <div ref={scrollRef} className="relative p-7 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex gap-6 mb-6">
            {/* Photo */}
            <div className="flex-shrink-0 w-[120px] h-[120px] rounded-[20px] bg-white/[0.05] overflow-hidden flex items-center justify-center">
              {loading ? (
                <div className="w-full h-full bg-white/[0.04] animate-pulse rounded-[20px]" />
              ) : photo ? (
                <Image
                  src={photo}
                  alt={d?.name ?? playerName}
                  width={120}
                  height={120}
                  className="object-cover w-full h-full"
                  unoptimized
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <span className="text-[40px] font-extrabold text-white/20 tracking-[-0.04em]">
                  {getInitials(d?.name ?? playerName)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[9px] font-semibold tracking-[0.38em] uppercase text-[#C8A96B]/55 mb-1.5">
                FIFA World Cup 2026
              </p>

              <div className="flex items-start gap-3 mb-3">
                <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#F3F4F6] leading-tight">
                  {loading ? (
                    <span className="inline-block w-40 h-6 bg-white/[0.06] rounded animate-pulse" />
                  ) : (d?.name ?? playerName)}
                </h2>
                {d?.shirtNumber && (
                  <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-[8px] border border-[#C8A96B]/30 flex items-center justify-center text-[13px] font-extrabold text-[#C8A96B]">
                    {d.shirtNumber}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                {!loading && (
                  <>
                    <InfoPill label="Posição" value={label} badge={abbr} />
                    {d?.nationality && <InfoPill label="Seleção" value={d.nationality} />}
                    {age !== null && <InfoPill label="Idade" value={`${age} anos`} />}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {!loading && d?.bio && (
            <div className="mb-4">
              <BioSection bio={d.bio} />
            </div>
          )}

          {/* Current Club */}
          {!loading && d?.currentClub && (
            <div className="mb-4 rounded-[16px] bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
              {d.currentClub.logo && (
                <Image
                  src={d.currentClub.logo}
                  alt={d.currentClub.name}
                  width={36}
                  height={36}
                  className="object-contain flex-shrink-0"
                  unoptimized
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-[#C8A96B]/50 mb-0.5">
                  Clube Atual
                </div>
                <div className="text-[14px] font-semibold text-[#F3F4F6]">{d.currentClub.name}</div>
              </div>
            </div>
          )}

          {/* Selection */}
          {!loading && d?.team && (
            <div className="mb-4 rounded-[16px] bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
              {d.team.logo && (
                <Image
                  src={d.team.logo}
                  alt={d.team.name}
                  width={36}
                  height={36}
                  className="object-contain flex-shrink-0"
                  unoptimized
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-[#C8A96B]/50 mb-0.5">
                  Seleção
                </div>
                <div className="text-[14px] font-semibold text-[#F3F4F6]">{d.team.name}</div>
              </div>
              <Link
                href={`/teams/${(d.team.tla ?? "").toLowerCase()}`}
                onClick={close}
                className="text-[10px] font-semibold text-[#C8A96B]/50 hover:text-[#C8A96B] transition-colors no-underline flex-shrink-0"
              >
                Ver elenco →
              </Link>
            </div>
          )}


          {/* Season Stats */}
          {!loading && d?.stats && (
            <div className="mb-4">
              <p className="mb-2 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/50">
                Temporada 2024/25
              </p>
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Gols" value={d.stats.goals.total} />
                <StatBox label="Assist." value={d.stats.goals.assists} />
                <StatBox label="Jogos" value={d.stats.games.appearences} />
                <StatBox
                  label="Rating"
                  value={d.stats.games.rating ? parseFloat(d.stats.games.rating).toFixed(1) : null}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <StatBox label="Titulares" value={d.stats.games.lineups} />
                <StatBox label="Passes" value={d.stats.passes.total} />
                <StatBox label="Amarelos" value={d.stats.cards.yellow} />
                <StatBox label="Vermelhos" value={d.stats.cards.red} />
              </div>
            </div>
          )}

          {/* Trophies */}
          {!loading && d?.trophies && d.trophies.length > 0 && (
            <TrophiesSection trophies={d.trophies} />
          )}

          {/* Stats placeholder — shown only when no stats loaded yet and not loading */}
          {!loading && !d?.stats && (
            <div className="rounded-[14px] border border-dashed border-white/[0.07] px-5 py-4 text-center mb-4">
              <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/35 mb-1">
                Estatísticas de Clube
              </p>
              <p className="text-[11px] text-[#6B7280]">
                Dados indisponíveis para este jogador
              </p>
            </div>
          )}

          {/* Link to full page */}
          <div className="mt-4 flex justify-end">
            <Link
              href={`/players/${playerId}`}
              onClick={close}
              className="text-[10px] font-semibold text-[#6B7280] hover:text-[#C8A96B] transition-colors no-underline"
            >
              Ver perfil completo →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .popup-modal { animation: popupIn 260ms cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes popupIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (max-width: 767px) {
          .popup-modal { animation: slideUp 300ms cubic-bezier(0.16,1,0.3,1) both; }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}

function InfoPill({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-[0.2em] uppercase text-[#6B7280] mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5">
        {badge && (
          <span className="text-[8px] font-extrabold text-[#C8A96B] bg-[#C8A96B]/10 rounded-[5px] px-1.5 py-0.5">
            {badge}
          </span>
        )}
        <span className="text-[13px] font-semibold text-[#F3F4F6]">{value}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-[12px] bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-center">
      <div className="text-[17px] font-extrabold text-[#F3F4F6] leading-none mb-0.5">
        {value != null ? value : "—"}
      </div>
      <div className="text-[8px] font-semibold tracking-[0.15em] uppercase text-[#6B7280]">{label}</div>
    </div>
  );
}
