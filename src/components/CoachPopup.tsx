"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";

type Trophy = { league: string; country: string; season: string; place: string };

type CoachData = {
  id: number;
  name: string;
  nationality: string | null;
  dateOfBirth: string | null;
  photo: string | null;
  contractStart: string | null;
  contractUntil: string | null;
  team: { id: number; tla: string | null; name: string; logo: string | null } | null;
  stats: { matches: number; wins: number; draws: number; losses: number; winRate: number } | null;
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
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

type Props = {
  coachId: number;
  coachName: string;
  coachPhoto: string | null;
  onClose: () => void;
};

export default function CoachPopup({ coachId, coachName, coachPhoto, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [data, setData]       = useState<CoachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const close = useCallback(() => { setData(null); onClose(); }, [onClose]);

  useEffect(() => {
    setLoading(true); setData(null); setPhotoError(false);
    fetch(`/api/coaches/${coachId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [coachId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [close]);

  const d = data;
  const age = calcAge(d?.dateOfBirth ?? null);
  const photo = photoError ? null : (d?.photo ?? coachPhoto);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="popup-modal relative w-full md:max-w-[620px] rounded-t-[28px] md:rounded-[28px] bg-[#13161C] border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <button
          onClick={close}
          className="hidden md:flex absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.10] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {d?.team?.tla && (
          <div className="absolute right-0 top-0 font-extrabold text-white/[0.03] leading-none tracking-[-0.06em] select-none pointer-events-none" style={{ fontSize: 160 }}>
            {d.team.tla}
          </div>
        )}

        <div className="relative p-7 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0 w-[110px] h-[110px] rounded-[18px] bg-white/[0.05] overflow-hidden flex items-center justify-center">
              {loading ? (
                <div className="w-full h-full bg-white/[0.04] animate-pulse rounded-[18px]" />
              ) : photo ? (
                <Image src={photo} alt={d?.name ?? coachName} width={110} height={110} className="object-cover w-full h-full" unoptimized onError={() => setPhotoError(true)} />
              ) : (
                <span className="text-[36px] font-extrabold text-white/20 tracking-[-0.04em]">{getInitials(d?.name ?? coachName)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[9px] font-semibold tracking-[0.38em] uppercase text-[#C8A96B]/55 mb-1.5">
                Técnico · FIFA World Cup 2026
              </p>
              <h2 className="text-[20px] font-bold tracking-[-0.03em] text-[#F3F4F6] leading-tight mb-3">
                {loading ? <span className="inline-block w-36 h-6 bg-white/[0.06] rounded animate-pulse" /> : (d?.name ?? coachName)}
              </h2>
              {!loading && (
                <div className="flex flex-wrap gap-4">
                  {d?.nationality && <InfoPill label="Nacionalidade" value={d.nationality} />}
                  {age !== null && <InfoPill label="Idade" value={`${age} anos`} />}
                  {d?.contractStart && <InfoPill label="No cargo desde" value={d.contractStart} />}
                </div>
              )}
            </div>
          </div>

          {/* Team */}
          {!loading && d?.team && (
            <div className="mb-4 rounded-[16px] bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
              {d.team.logo && <Image src={d.team.logo} alt={d.team.name} width={36} height={36} className="object-contain flex-shrink-0" unoptimized />}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-[#C8A96B]/50 mb-0.5">Seleção</div>
                <div className="text-[14px] font-semibold text-[#F3F4F6]">{d.team.name}</div>
              </div>
              <Link href={`/teams/${(d.team.tla ?? "").toLowerCase()}`} onClick={close} className="text-[10px] font-semibold text-[#C8A96B]/50 hover:text-[#C8A96B] transition-colors no-underline flex-shrink-0">
                Ver elenco →
              </Link>
            </div>
          )}

          {/* Career Stats */}
          {!loading && d?.stats && d.stats.matches > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/50">
                Carreira como Técnico
              </p>
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Jogos" value={d.stats.matches} />
                <StatBox label="Vitórias" value={d.stats.wins} />
                <StatBox label="Empates" value={d.stats.draws} />
                <StatBox label="Derrotas" value={d.stats.losses} />
              </div>
              <div className="mt-2 rounded-[12px] bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] text-[#6B7280]">Taxa de vitórias</span>
                <span className="text-[18px] font-extrabold text-[#C8A96B]">{d.stats.winRate}%</span>
              </div>
            </div>
          )}

          {/* Trophies */}
          {!loading && d?.trophies && d.trophies.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/50">Conquistas</p>
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                {d.trophies.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[10px] bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                    <span className="text-[14px] flex-shrink-0">🏆</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-[#F3F4F6] truncate">{t.league}</div>
                      <div className="text-[10px] text-[#6B7280]">{t.country} · {t.season}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !d?.stats && (
            <div className="rounded-[14px] border border-dashed border-white/[0.07] px-5 py-4 text-center mb-4">
              <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/35 mb-1">Estatísticas</p>
              <p className="text-[11px] text-[#6B7280]">Dados indisponíveis para este técnico</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Link href={`/coaches/${coachId}`} onClick={close} className="text-[10px] font-semibold text-[#6B7280] hover:text-[#C8A96B] transition-colors no-underline">
              Ver perfil completo →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .popup-modal { animation: popupIn 260ms cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes popupIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @media (max-width:767px) {
          .popup-modal { animation: slideUp 300ms cubic-bezier(0.16,1,0.3,1) both; }
          @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        }
      `}</style>
    </div>,
    document.body
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-[0.2em] uppercase text-[#6B7280] mb-0.5">{label}</div>
      <span className="text-[13px] font-semibold text-[#F3F4F6]">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-[12px] bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-center">
      <div className="text-[17px] font-extrabold text-[#F3F4F6] leading-none mb-0.5">{value ?? "—"}</div>
      <div className="text-[8px] font-semibold tracking-[0.15em] uppercase text-[#6B7280]">{label}</div>
    </div>
  );
}
