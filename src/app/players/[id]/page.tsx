import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

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
  if (!position) return { abbr: "—", label: "Posição desconhecida" };
  return POSITION_MAP[position] ?? { abbr: position.slice(0, 3).toUpperCase(), label: position };
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatStage(stage: string | null): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Fase de Grupos",
    LAST_16: "Oitavas de Final",
    QUARTER_FINALS: "Quartas de Final",
    SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "3º Lugar",
    FINAL: "Final",
  };
  return stage ? (map[stage] ?? stage) : "";
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    include: { team: { select: { name: true } } },
  });
  if (!player) return {};
  return {
    title: `${player.name} — Copa360`,
    description: `Perfil de ${player.name} na FIFA World Cup 2026.`,
  };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    include: {
      team: {
        select: {
          id: true,
          tla: true,
          name: true,
          logo: true,
          country: true,
          homeMatches: {
            orderBy: { utcDate: "asc" },
            take: 6,
            select: {
              id: true,
              utcDate: true,
              stage: true,
              group: true,
              status: true,
              homeScore: true,
              awayScore: true,
              awayTeam: { select: { tla: true, name: true, logo: true } },
            },
          },
          awayMatches: {
            orderBy: { utcDate: "asc" },
            take: 6,
            select: {
              id: true,
              utcDate: true,
              stage: true,
              group: true,
              status: true,
              homeScore: true,
              awayScore: true,
              homeTeam: { select: { tla: true, name: true, logo: true } },
            },
          },
        },
      },
    },
  });

  if (!player) notFound();

  const { abbr, label } = getPos(player.position);
  const age = calcAge(player.dateOfBirth);
  const team = player.team;

  // Merge and sort upcoming matches
  type MatchEntry = {
    id: number;
    utcDate: Date;
    stage: string | null;
    group: string | null;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    opponent: { tla: string | null; name: string; logo: string | null };
    isHome: boolean;
  };

  const matches: MatchEntry[] = [
    ...(team?.homeMatches ?? []).map((m) => ({
      ...m,
      opponent: m.awayTeam ?? { tla: "?", name: "TBD", logo: null },
      isHome: true,
    })),
    ...(team?.awayMatches ?? []).map((m) => ({
      ...m,
      opponent: m.homeTeam ?? { tla: "?", name: "TBD", logo: null },
      isHome: false,
    })),
  ]
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 6);

  return (
    <div className="px-12 pt-12 pb-24 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-[11px] text-[#6B7280]">
        <Link href="/" className="hover:text-[#C8A96B] transition-colors">Início</Link>
        <span>/</span>
        <Link href="/players" className="hover:text-[#C8A96B] transition-colors">Jogadores</Link>
        <span>/</span>
        <span className="text-[#F3F4F6]">{player.name}</span>
      </div>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-white/[0.03] border border-white/[0.07] mb-6">
        {/* Watermark TLA */}
        <div
          className="absolute right-0 bottom-0 font-extrabold text-white/[0.03] leading-none tracking-[-0.06em] select-none pointer-events-none"
          style={{ fontSize: "clamp(120px, 18vw, 220px)" }}
        >
          {team?.tla}
        </div>

        <div className="relative z-10 flex gap-10 p-10">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-[140px] h-[140px] rounded-[20px] bg-white/[0.06] overflow-hidden flex items-center justify-center">
              {player.photo ? (
                <Image
                  src={player.photo}
                  alt={player.name}
                  width={140}
                  height={140}
                  className="object-cover w-full h-full"
                  unoptimized
                  priority
                />
              ) : (
                <span className="text-[48px] font-extrabold text-white/20 tracking-[-0.04em]">
                  {getInitials(player.name)}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-[9px] font-semibold tracking-[0.38em] uppercase text-[#C8A96B]/55">
              FIFA World Cup 2026
            </p>

            <div className="flex items-start gap-4 mb-4">
              <h1
                className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
                style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
              >
                {player.name}
              </h1>
              {player.shirtNumber && (
                <span className="mt-1 flex-shrink-0 w-10 h-10 rounded-[10px] border border-[#C8A96B]/30 flex items-center justify-center text-[16px] font-extrabold text-[#C8A96B]">
                  {player.shirtNumber}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <StatItem label="Posição" value={label} badge={abbr} />
              {player.nationality && (
                <StatItem label="Nacionalidade" value={player.nationality} />
              )}
              {age !== null && (
                <StatItem label="Idade" value={`${age} anos`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TEAM CARD ── */}
      {team && (
        <Link
          href={`/teams/${(team.tla ?? "").toLowerCase()}`}
          className="group block mb-6 rounded-[20px] bg-white/[0.03] border border-white/[0.07] px-6 py-4 hover:border-[#C8A96B]/25 transition-colors no-underline"
        >
          <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">
            Seleção
          </p>
          <div className="flex items-center gap-4">
            {team.logo ? (
              <Image
                src={team.logo}
                alt={team.name}
                width={48}
                height={48}
                className="object-contain drop-shadow"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-[#6B7280]">
                {team.tla}
              </div>
            )}
            <div>
              <div className="text-[16px] font-bold text-[#F3F4F6]">{team.name}</div>
              {team.country && (
                <div className="text-[11px] text-[#6B7280]">{team.country}</div>
              )}
            </div>
            <span className="ml-auto text-[#C8A96B]/40 group-hover:text-[#C8A96B]/70 transition-colors text-[12px]">
              Ver elenco →
            </span>
          </div>
        </Link>
      )}

      {/* ── MATCHES ── */}
      <div className="mb-6">
        <h2 className="mb-4 text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
          Jogos da {team?.name ?? "Seleção"}
        </h2>

        {matches.length > 0 ? (
          <div className="flex flex-col gap-2">
            {matches.map((m) => {
              const isLive = m.status === "IN_PLAY" || m.status === "PAUSED";
              const isDone = m.status === "FINISHED";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 rounded-[14px] bg-white/[0.03] border border-white/[0.07] px-5 py-3.5"
                >
                  {/* Date / Status */}
                  <div className="w-[90px] flex-shrink-0">
                    {isLive ? (
                      <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-red-400">
                        Ao vivo
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#6B7280]">
                        {formatDate(m.utcDate)}
                      </span>
                    )}
                  </div>

                  {/* Stage */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-semibold tracking-[0.12em] uppercase text-[#C8A96B]/50 mb-0.5">
                      {formatStage(m.stage)}{m.group ? ` · ${m.group}` : ""}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F3F4F6]">
                      <span>{m.isHome ? team?.tla : m.opponent.tla}</span>
                      <span className="text-white/20">vs</span>
                      <span>{m.isHome ? m.opponent.tla : team?.tla}</span>
                      {isDone && (
                        <span className="ml-2 text-[12px] font-bold text-[#C8A96B]">
                          {m.isHome
                            ? `${m.homeScore ?? 0}–${m.awayScore ?? 0}`
                            : `${m.awayScore ?? 0}–${m.homeScore ?? 0}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Opponent logo */}
                  {m.opponent.logo && (
                    <Image
                      src={m.opponent.logo}
                      alt={m.opponent.name}
                      width={28}
                      height={28}
                      className="object-contain opacity-60 flex-shrink-0"
                      unoptimized
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[14px] bg-white/[0.02] border border-white/[0.05] px-5 py-4 text-[12px] text-[#6B7280]">
            Jogos ainda não definidos.
          </div>
        )}
      </div>

      {/* ── STATS PLACEHOLDER ── */}
      <div className="rounded-[20px] border border-dashed border-white/[0.08] px-8 py-10 text-center">
        <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#C8A96B]/40 mb-2">
          Estatísticas da Copa
        </p>
        <p className="text-[13px] text-[#6B7280]">
          Disponível após o início do torneio · 19 de junho de 2026
        </p>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-[0.22em] uppercase text-[#6B7280] mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[9px] font-extrabold tracking-[0.04em] text-[#C8A96B] bg-[#C8A96B]/10 rounded-[6px] px-1.5 py-0.5">
            {badge}
          </span>
        )}
        <span className="text-[14px] font-semibold text-[#F3F4F6]">{value}</span>
      </div>
    </div>
  );
}
