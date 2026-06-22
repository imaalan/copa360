"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

type MatchTeam = { name: string; tla: string | null; logo: string | null } | null;

type StreamingLink = { platform: string; url: string };

type Match = {
  id: number;
  utcDate: Date;
  status: string;
  matchday: number | null;
  stage: string | null;
  group: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  streamingLinks?: unknown;
};

const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE:   "Fase de Grupos",
  LAST_32:       "Rodada de 32",
  LAST_16:       "Oitavas de Final",
  QUARTER_FINALS:"Quartas de Final",
  SEMI_FINALS:   "Semifinais",
  THIRD_PLACE:   "3º Lugar",
  FINAL:         "Final",
};

const STAGE_ORDER = [
  "GROUP_STAGE", "LAST_32", "LAST_16",
  "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL",
];

const GROUP_LABEL: Record<string, string> = {
  GROUP_A: "Grupo A", GROUP_B: "Grupo B", GROUP_C: "Grupo C",
  GROUP_D: "Grupo D", GROUP_E: "Grupo E", GROUP_F: "Grupo F",
  GROUP_G: "Grupo G", GROUP_H: "Grupo H", GROUP_I: "Grupo I",
  GROUP_J: "Grupo J", GROUP_K: "Grupo K", GROUP_L: "Grupo L",
};

const TEAM_NAME_PTBR: Record<string, string> = {
  ALG: "Argélia",       ARG: "Argentina",          AUS: "Austrália",
  AUT: "Áustria",       BEL: "Bélgica",            BIH: "Bósnia e Herzegovina",
  BRA: "Brasil",        CAN: "Canadá",             CIV: "Costa do Marfim",
  COD: "Congo (RD)",    COL: "Colômbia",           CPV: "Cabo Verde",
  CRO: "Croácia",       CUW: "Curaçao",            CZE: "Tchéquia",
  ECU: "Equador",       EGY: "Egito",              ENG: "Inglaterra",
  ESP: "Espanha",       FRA: "França",             GER: "Alemanha",
  GHA: "Gana",          HAI: "Haiti",              IRN: "Irã",
  IRQ: "Iraque",        JOR: "Jordânia",           JPN: "Japão",
  KOR: "Coreia do Sul", KSA: "Arábia Saudita",     MAR: "Marrocos",
  MEX: "México",        NED: "Países Baixos",      NOR: "Noruega",
  NZL: "Nova Zelândia", PAN: "Panamá",             PAR: "Paraguai",
  POR: "Portugal",      QAT: "Catar",              RSA: "África do Sul",
  SCO: "Escócia",       SEN: "Senegal",            SUI: "Suíça",
  SWE: "Suécia",        TUN: "Tunísia",            TUR: "Turquia",
  URY: "Uruguai",       USA: "Estados Unidos",     UZB: "Uzbequistão",
};

const STAGE_TABS = [
  { key: "all",          label: "Todos" },
  { key: "GROUP_STAGE",  label: "Grupos" },
  { key: "knockout",     label: "Mata-Mata" },
];


function formatDay(utcDate: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(utcDate));
}

function formatTime(utcDate: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(utcDate));
}

const KNOCKOUT_STAGES = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];

function toBRTDateKey(utcDate: Date): string {
  const [d, m, y] = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(utcDate)).split("/");
  return `${y}-${m}-${d}`;
}

function formatDateChip(utcDate: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(utcDate));
  const wd = (parts.find(p => p.type === "weekday")?.value ?? "").replace(".", "").toUpperCase();
  const day = parts.find(p => p.type === "day")?.value ?? "";
  const mon = parts.find(p => p.type === "month")?.value ?? "";
  return `${wd} ${day}/${mon}`;
}

export default function MatchesView({ matches }: { matches: Match[] }) {
  const [stageTab, setStageTab] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const today = toBRTDateKey(new Date());
    return matches.some((m) => toBRTDateKey(m.utcDate) === today) ? today : "all";
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
  }, []);

  const matchDays = useMemo(() => {
    const seen = new Map<string, Date>();
    for (const m of matches) {
      const key = toBRTDateKey(m.utcDate);
      if (!seen.has(key)) seen.set(key, m.utcDate);
    }
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, date]) => ({ key, label: formatDateChip(date) }));
  }, [matches]);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, matchDays]);

  const groups = useMemo(() => {
    const g = new Set(matches.map((m) => m.group).filter(Boolean) as string[]);
    return Array.from(g).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (stageTab === "GROUP_STAGE" && m.stage !== "GROUP_STAGE") return false;
      if (stageTab === "knockout" && !KNOCKOUT_STAGES.includes(m.stage ?? "")) return false;
      if (groupFilter !== "all" && m.group !== groupFilter) return false;
      if (dateFilter !== "all" && toBRTDateKey(m.utcDate) !== dateFilter) return false;
      return true;
    });
  }, [matches, stageTab, groupFilter, dateFilter]);

  // Group by stage then by day
  const sections = useMemo(() => {
    const byStage: Record<string, Match[]> = {};
    for (const m of filtered) {
      const s = m.stage ?? "?";
      byStage[s] ??= [];
      byStage[s].push(m);
    }
    return STAGE_ORDER.filter((s) => byStage[s]?.length).map((s) => ({
      stage: s,
      label: STAGE_LABEL[s] ?? s,
      matches: byStage[s],
    }));
  }, [filtered]);

  return (
    <>
      {/* Tab + Group filter bar */}
      <div className="mb-8 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5">
          {STAGE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStageTab(t.key); setGroupFilter("all"); setDateFilter("all"); }}
              className={`h-[44px] px-4 rounded-[14px] text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors ${
                stageTab === t.key
                  ? "bg-[#C8A96B] text-[#111315]"
                  : "bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(stageTab === "all" || stageTab === "GROUP_STAGE") && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-[44px] px-4 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-[#6B7280] outline-none focus:border-[#C8A96B]/30 transition-colors cursor-pointer"
          >
            <option value="all">Todos os grupos</option>
            {groups.map((g) => (
              <option key={g} value={g}>{GROUP_LABEL[g] ?? g}</option>
            ))}
          </select>
        )}

        <span className="ml-auto text-[11px] text-[#6B7280]">
          {filtered.length} partida{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Date chips */}
      <div className="mb-6 relative flex items-center gap-1.5">
        <button
          aria-label="Datas anteriores"
          onClick={() => { chipsRef.current?.scrollBy({ left: -200, behavior: "instant" }); }}
          disabled={!canScrollLeft}
          className="hidden md:flex flex-shrink-0 h-[36px] w-[36px] items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6] transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          ‹
        </button>
        <div
          ref={chipsRef}
          onScroll={updateScrollState}
          className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            onClick={() => setDateFilter("all")}
            className={`flex-shrink-0 h-[36px] px-3 rounded-[10px] text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
              dateFilter === "all"
                ? "bg-[#C8A96B] text-[#111315]"
                : "bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6]"
            }`}
          >
            Todas as datas
          </button>
          {matchDays.map((d) => (
            <button
              key={d.key}
              onClick={() => setDateFilter(d.key)}
              className={`flex-shrink-0 h-[36px] px-3 rounded-[10px] text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
                dateFilter === d.key
                  ? "bg-[#C8A96B] text-[#111315]"
                  : "bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          aria-label="Próximas datas"
          onClick={() => { chipsRef.current?.scrollBy({ left: 200, behavior: "instant" }); }}
          disabled={!canScrollRight}
          className="hidden md:flex flex-shrink-0 h-[36px] w-[36px] items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-[#6B7280] hover:text-[#F3F4F6] transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          ›
        </button>
      </div>

      {/* Flat list by date OR sections by stage */}
      {dateFilter !== "all" ? (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {sections.map(({ stage, label, matches: sMatches }) => (
            <div key={stage}>
              {/* Stage header */}
              <div className="mb-4 flex items-center gap-4">
                <h2 className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/70">
                  {label}
                </h2>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-[#6B7280]">{sMatches.length} jogos</span>
              </div>

              {/* Group sub-headers for group stage */}
              {stage === "GROUP_STAGE"
                ? <GroupStageSection matches={sMatches} />
                : <MatchList matches={sMatches} showGroup={false} />
              }
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GroupStageSection({ matches }: { matches: Match[] }) {
  const byGroup: Record<string, Match[]> = {};
  for (const m of matches) {
    const g = m.group ?? "?";
    byGroup[g] ??= [];
    byGroup[g].push(m);
  }
  const sortedGroups = Object.keys(byGroup).sort();

  return (
    <div className="flex flex-col gap-8">
      {sortedGroups.map((g) => (
        <div key={g}>
          <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">
            {GROUP_LABEL[g] ?? g}
          </p>
          <MatchList matches={byGroup[g]} showGroup={false} />
        </div>
      ))}
    </div>
  );
}

function MatchList({ matches }: { matches: Match[]; showGroup: boolean }) {
  // Group by day
  const byDay: Record<string, Match[]> = {};
  for (const m of matches) {
    const day = formatDay(m.utcDate);
    byDay[day] ??= [];
    byDay[day].push(m);
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byDay).map(([day, dayMatches]) => (
        <div key={day}>
          <p className="mb-2 text-[10px] font-semibold text-[#6B7280] tracking-[0.06em]">{day}</p>
          <div className="flex flex-col gap-2">
            {dayMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match: m }: { match: Match }) {
  const isFinished  = m.status === "FINISHED";
  const isLive      = m.status === "IN_PLAY" || m.status === "PAUSED";
  const isPostponed = m.status === "POSTPONED";
  const links = Array.isArray(m.streamingLinks) ? (m.streamingLinks as StreamingLink[]) : [];
  const streamUrl   = links[0]?.url ?? null;
  const watchLabel  = isFinished ? "▶ Rever jogo" : "▶ Assistir ao vivo";

  return (
    <div className="group relative flex flex-col gap-1 bg-white/[0.03] border border-white/[0.07] rounded-[16px] px-3 md:px-5 py-3 md:py-4 hover:border-[#C8A96B]/20 transition-colors">
      <div className="flex items-center gap-2 md:gap-4">
      {/* Live pulse */}
      {isLive && (
        <span className="absolute top-2.5 right-2.5 md:hidden flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}

      {/* Time */}
      <div className="w-10 md:w-12 flex-shrink-0 text-center">
        <div className="text-[10px] md:text-[11px] font-semibold text-[#6B7280]">{formatTime(m.utcDate)}</div>
        <div className="text-[8px] md:text-[9px] text-white/20 mt-0.5">BRT</div>
      </div>

      {/* Home team */}
      <TeamBlock team={m.homeTeam} align="right" />

      {/* Score / VS */}
      <div className="flex-shrink-0 w-14 md:w-20 flex items-center justify-center gap-1 md:gap-2">
        {isFinished || isLive ? (
          <div className="flex items-center gap-1 md:gap-2">
            <span className={`text-[18px] md:text-[22px] font-extrabold tabular-nums tracking-[-0.04em] ${isLive ? "text-red-400" : "text-[#F3F4F6]"}`}>
              {m.homeScore}
            </span>
            <span className="text-[#6B7280] text-[12px] md:text-[14px]">·</span>
            <span className={`text-[18px] md:text-[22px] font-extrabold tabular-nums tracking-[-0.04em] ${isLive ? "text-red-400" : "text-[#F3F4F6]"}`}>
              {m.awayScore}
            </span>
          </div>
        ) : (
          <span className="text-[10px] md:text-[11px] font-bold text-[#6B7280] tracking-[0.12em]">VS</span>
        )}
      </div>

      {/* Away team */}
      <TeamBlock team={m.awayTeam} align="left" />

      {/* Status badge — mobile visible */}
      <div className="md:hidden">
        <StatusBadge status={m.status} />
      </div>

      {/* Status badge + watch link — desktop only */}
      <div className="ml-auto hidden md:flex items-center gap-3 flex-shrink-0">
        {streamUrl && !isPostponed && (
          <Link
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-[0.06em] text-[#C8A96B] hover:text-[#C8A96B]/80 transition-colors no-underline"
          >
            {watchLabel}
          </Link>
        )}
        <StatusBadge status={m.status} />
      </div>
      </div>

      {/* Mobile streaming link */}
      {streamUrl && !isPostponed && (
        <div className="md:hidden flex justify-center">
          <Link
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-[0.06em] text-[#C8A96B] no-underline"
          >
            {watchLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamBlock({ team, align }: { team: MatchTeam; align: "left" | "right" }) {
  const isRight = align === "right";
  return (
    <div className={`flex items-center gap-1.5 md:gap-2.5 flex-1 min-w-0 ${isRight ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
        {team?.logo ? (
          <Image src={team.logo} alt={team?.name ?? ""} width={32} height={32} className="object-contain" unoptimized />
        ) : (
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/[0.06]" />
        )}
      </div>
      <div className={`min-w-0 flex-1 ${isRight ? "text-right" : ""}`}>
        <div className="text-[13px] md:text-[13px] font-extrabold text-[#F3F4F6] tracking-[-0.02em] truncate">
          {team?.tla ?? "—"}
        </div>
        <div className="text-[10px] text-[#6B7280] truncate">
          {(team?.tla && TEAM_NAME_PTBR[team.tla]) ?? team?.name ?? "—"}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    TIMED:    { label: "Agendado", cls: "text-[#6B7280] bg-white/[0.05]" },
    FINISHED: { label: "Encerrado", cls: "text-white/40 bg-white/[0.04]" },
    IN_PLAY:  { label: "Ao Vivo",  cls: "text-red-400 bg-red-500/10" },
    PAUSED:   { label: "Intervalo",cls: "text-yellow-400 bg-yellow-500/10" },
    POSTPONED:{ label: "Adiado",   cls: "text-orange-400 bg-orange-500/10" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "text-[#6B7280] bg-white/[0.04]" };
  return (
    <span className={`text-[9px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
