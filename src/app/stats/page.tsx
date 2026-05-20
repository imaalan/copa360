import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "Estatísticas — Copa360",
  description: "Dados e estatísticas das 48 seleções da FIFA World Cup 2026.",
};

const POSITION_GROUPS: Record<string, string> = {
  GK: "Goleiros",
  CB: "Defensores", RB: "Defensores", LB: "Defensores",
  SW: "Defensores", RWB: "Defensores", LWB: "Defensores", DEF: "Defensores",
  CDM: "Meias", CM: "Meias", CAM: "Meias",
  RM: "Meias", LM: "Meias", MID: "Meias",
  RW: "Atacantes", LW: "Atacantes", CF: "Atacantes",
  ST: "Atacantes", SS: "Atacantes", FWD: "Atacantes",
};

function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default async function StatsPage() {
  const [allPlayers, allTeams] = await Promise.all([
    prisma.player.findMany({
      select: { name: true, position: true, dateOfBirth: true, team: { select: { tla: true, logo: true, name: true } } },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { players: true } } },
    }),
  ]);

  // Position distribution (grouped)
  const posCounts: Record<string, number> = { Goleiros: 0, Defensores: 0, Meias: 0, Atacantes: 0, Outros: 0 };
  for (const p of allPlayers) {
    const g = p.position ? (POSITION_GROUPS[p.position] ?? "Outros") : "Outros";
    posCounts[g] = (posCounts[g] ?? 0) + 1;
  }
  const posTotal = Object.values(posCounts).reduce((a, b) => a + b, 0);
  const posEntries = Object.entries(posCounts).filter(([, v]) => v > 0);

  // Squad sizes ranked
  const squadsBySize = [...allTeams].sort((a, b) => b._count.players - a._count.players);

  // Age stats — filter clearly bad DOB data (valid: 1980–2010)
  const validDobs = allPlayers
    .filter((p) => {
      if (!p.dateOfBirth) return false;
      const y = new Date(p.dateOfBirth).getFullYear();
      return y >= 1980 && y <= 2010;
    })
    .map((p) => ({ ...p, age: calcAge(new Date(p.dateOfBirth!)) }));

  const oldest  = [...validDobs].sort((a, b) => a.age - b.age).reverse().slice(0, 5);
  const youngest = [...validDobs].sort((a, b) => a.age - b.age).slice(0, 5);

  // Average age by team
  const teamAges: Record<string, number[]> = {};
  for (const p of validDobs) {
    const tla = p.team?.tla ?? "?";
    teamAges[tla] ??= [];
    teamAges[tla].push(p.age);
  }
  const teamAvgAge = allTeams
    .map((t) => {
      const ages = teamAges[t.tla ?? ""] ?? [];
      const avg = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
      return { tla: t.tla, name: t.name, logo: t.logo, avg: Math.round(avg * 10) / 10 };
    })
    .filter((t) => t.avg > 0)
    .sort((a, b) => a.avg - b.avg);

  const youngest5Teams = teamAvgAge.slice(0, 5);
  const oldest5Teams   = [...teamAvgAge].reverse().slice(0, 5);
  const maxSquad = squadsBySize[0]._count.players;

  return (
    <section className="px-4 md:px-12 pt-10 md:pt-16 pb-24 max-w-[1440px]">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-3 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          FIFA World Cup 2026
        </p>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6] mb-4"
          style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
        >
          Estatísticas
        </h1>
        <div className="h-px bg-white/[0.06]" />
      </div>

      {/* Hero numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-14">
        {[
          { value: "48",   label: "Seleções",  sub: "de 5 confederações" },
          { value: "1213", label: "Jogadores", sub: "convocados" },
          { value: "104",  label: "Jogos",     sub: "no calendário" },
          { value: "3",    label: "Países-sede",sub: "EUA · Canadá · México" },
        ].map(({ value, label, sub }) => (
          <div key={label} className="relative bg-white/[0.03] border border-white/[0.07] rounded-[20px] px-6 pt-6 pb-5 overflow-hidden">
            <div className="absolute top-0 left-[20%] right-[20%] h-px bg-[#C8A96B] opacity-70" />
            <div
              className="font-extrabold tabular-nums leading-none tracking-[-0.05em] text-[#F3F4F6] mb-1"
              style={{ fontSize: "clamp(36px, 4vw, 56px)" }}
            >
              {value}
            </div>
            <div className="text-[12px] font-semibold text-[#F3F4F6]">{label}</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">

        {/* Position distribution */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-7">
          <SectionTitle>Distribuição por Posição</SectionTitle>
          <div className="flex flex-col gap-4 mt-6">
            {posEntries
              .sort(([, a], [, b]) => b - a)
              .map(([name, count]) => {
                const pct = Math.round((count / posTotal) * 100);
                return (
                  <div key={name}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[12px] font-semibold text-[#F3F4F6]">{name}</span>
                      <span className="text-[11px] tabular-nums text-[#C8A96B]">{count} <span className="text-[#6B7280]">({pct}%)</span></span>
                    </div>
                    <div className="h-[6px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C8A96B] rounded-full transition-all"
                        style={{ width: `${pct}%`, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Avg age */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-7">
          <SectionTitle>Elencos por Idade Média</SectionTitle>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">Mais Jovens</p>
              <div className="flex flex-col gap-2">
                {youngest5Teams.map((t, i) => (
                  <TeamAgeRow key={t.tla} rank={i + 1} team={t} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">Mais Experientes</p>
              <div className="flex flex-col gap-2">
                {oldest5Teams.map((t, i) => (
                  <TeamAgeRow key={t.tla} rank={i + 1} team={t} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Squad sizes */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-7 mb-14">
        <div className="flex items-baseline justify-between mb-6">
          <SectionTitle>Tamanho dos Elencos</SectionTitle>
          <span className="text-[10px] text-[#6B7280]">jogadores convocados por seleção</span>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2">
          {squadsBySize.map((t) => (
            <Link key={t.id} href={`/teams/${t.tla?.toLowerCase()}`} className="group flex items-center gap-3 no-underline">
              <div className="w-5 flex-shrink-0">
                {t.logo && (
                  <Image src={t.logo} alt={t.name} width={20} height={20} className="object-contain" unoptimized />
                )}
              </div>
              <span className="text-[11px] text-[#6B7280] group-hover:text-[#F3F4F6] transition-colors w-8 flex-shrink-0">{t.tla}</span>
              <div className="flex-1 h-[4px] bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8A96B]/70 rounded-full group-hover:bg-[#C8A96B] transition-colors"
                  style={{ width: `${(t._count.players / maxSquad) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-bold tabular-nums text-[#C8A96B] w-6 text-right">{t._count.players}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Oldest / Youngest players */}
      <div className="grid grid-cols-2 gap-8">
        <PlayerAgeTable title="Jogadores Mais Velhos" players={oldest} />
        <PlayerAgeTable title="Jogadores Mais Jovens" players={youngest} />
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/70">
      {children}
    </h2>
  );
}

function TeamAgeRow({ rank, team }: { rank: number; team: { tla: string | null; name: string; logo: string | null; avg: number } }) {
  return (
    <Link href={`/teams/${team.tla?.toLowerCase()}`} className="group flex items-center gap-2.5 no-underline">
      <span className="text-[10px] text-white/20 w-3 tabular-nums">{rank}</span>
      {team.logo && (
        <Image src={team.logo} alt={team.name} width={18} height={18} className="object-contain" unoptimized />
      )}
      <span className="text-[12px] text-[#6B7280] group-hover:text-[#F3F4F6] transition-colors flex-1 truncate">{team.tla}</span>
      <span className="text-[12px] font-bold tabular-nums text-[#C8A96B]">{team.avg}</span>
    </Link>
  );
}

function PlayerAgeTable({
  title,
  players,
}: {
  title: string;
  players: { name: string; age: number; team: { tla: string | null; logo: string | null; name: string } | null }[];
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-7">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-5 flex flex-col gap-3">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-white/20 w-4 tabular-nums">{i + 1}</span>
            {p.team?.logo && (
              <Image src={p.team.logo} alt={p.team.name} width={20} height={20} className="object-contain flex-shrink-0" unoptimized />
            )}
            <span className="text-[13px] font-semibold text-[#F3F4F6] flex-1 truncate">{p.name}</span>
            <span className="text-[10px] text-[#6B7280] flex-shrink-0">{p.team?.tla}</span>
            <span className="text-[13px] font-bold tabular-nums text-[#C8A96B] flex-shrink-0 w-10 text-right">
              {p.age} <span className="text-[10px] font-normal text-[#6B7280]">anos</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
