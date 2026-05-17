"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

type PopupData = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  shirtNumber: number | null;
  photo: string | null;
  team: { id: number; tla: string | null; name: string; logo: string | null } | null;
  currentClub: { name: string; crest: string | null; competitions: string[] } | null;
  matches: Array<{
    id: number;
    utcDate: string;
    stage: string | null;
    group: string | null;
    status: string;
    opponent: { tla: string | null; name: string; logo: string | null } | null;
    isHome: boolean;
  }>;
};

const POSITION_MAP: Record<string, { abbr: string; label: string }> = {
  Goalkeeper:           { abbr: "GR",  label: "Goleiro" },
  Defence:              { abbr: "DEF", label: "Defensor" },
  "Centre-Back":        { abbr: "ZAG", label: "Zagueiro" },
  "Left-Back":          { abbr: "LE",  label: "Lateral Esquerdo" },
  "Right-Back":         { abbr: "LD",  label: "Lateral Direito" },
  Midfield:             { abbr: "MEI", label: "Meia" },
  "Defensive Midfield": { abbr: "VOL", label: "Volante" },
  "Central Midfield":   { abbr: "MEI", label: "Meia Central" },
  "Attacking Midfield": { abbr: "MAI", label: "Meia Atacante" },
  Offence:              { abbr: "ATA", label: "Atacante" },
  "Left Winger":        { abbr: "PE",  label: "Ponta Esquerda" },
  "Right Winger":       { abbr: "PD",  label: "Ponta Direita" },
  "Centre-Forward":     { abbr: "CA",  label: "Centroavante" },
  "Secondary Striker":  { abbr: "SA",  label: "Segundo Atacante" },
};

function getPos(position: string | null) {
  if (!position) return { abbr: "—", label: "—" };
  return POSITION_MAP[position] ?? { abbr: position.slice(0, 3).toUpperCase(), label: position };
}

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

function formatStage(stage: string | null, group: string | null): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Fase de Grupos",
    LAST_16: "Oitavas",
    QUARTER_FINALS: "Quartas",
    SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "3º Lugar",
    FINAL: "Final",
  };
  const s = stage ? (map[stage] ?? stage) : "";
  return group ? `${s} · ${group}` : s;
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(d));
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

  const close = useCallback(() => {
    setData(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setData(null);
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
  const { abbr, label } = getPos(d?.position ?? null);
  const age = calcAge(d?.dateOfBirth ?? null);
  const photo = d?.photo ?? playerPhoto;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[680px] rounded-[28px] bg-[#13161C] border border-white/[0.08] shadow-2xl overflow-hidden"
        style={{ animation: "popupIn 220ms cubic-bezier(0.16,1,0.3,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.10] transition-colors"
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

        <div className="relative p-7">
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

          {/* Current Club */}
          {!loading && d?.currentClub && (
            <div className="mb-4 rounded-[16px] bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
              {d.currentClub.crest && (
                <Image
                  src={d.currentClub.crest}
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
                {d.currentClub.competitions.length > 0 && (
                  <div className="text-[10px] text-[#6B7280] truncate">
                    {d.currentClub.competitions.join(" · ")}
                  </div>
                )}
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

          {/* Upcoming matches */}
          {!loading && d?.matches && d.matches.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/50">
                Próximos Jogos
              </p>
              <div className="flex flex-col gap-1.5">
                {d.matches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-[12px] bg-white/[0.02] border border-white/[0.05] px-4 py-2.5"
                  >
                    <span className="text-[10px] text-[#6B7280] w-[52px] flex-shrink-0">
                      {formatDate(m.utcDate)}
                    </span>
                    <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[#C8A96B]/40 flex-1 truncate">
                      {formatStage(m.stage, m.group)}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[12px] font-bold text-[#F3F4F6]">
                        {m.isHome ? d.team?.tla : m.opponent?.tla}
                      </span>
                      <span className="text-[10px] text-white/20">vs</span>
                      <span className="text-[12px] font-bold text-[#F3F4F6]">
                        {m.isHome ? m.opponent?.tla : d.team?.tla}
                      </span>
                      {m.opponent?.logo && (
                        <Image
                          src={m.opponent.logo}
                          alt={m.opponent.name}
                          width={20}
                          height={20}
                          className="object-contain opacity-60"
                          unoptimized
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats placeholder */}
          <div className="rounded-[14px] border border-dashed border-white/[0.07] px-5 py-4 text-center">
            <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/35 mb-1">
              Estatísticas da Copa
            </p>
            <p className="text-[11px] text-[#6B7280]">
              Disponível após 19 de junho de 2026
            </p>
          </div>

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
        @keyframes popupIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
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
