import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) return {};
  return {
    title: `${team.name} — Copa360`,
    description: `Elenco e informações de ${team.name} na Copa do Mundo 2026.`,
  };
}

async function getTeam(slug: string) {
  return prisma.team.findFirst({
    where: { tla: slug.toUpperCase() },
    include: {
      players: { orderBy: { name: "asc" } },
      _count: { select: { players: true } },
    },
  });
}

// Map API position strings → PT-BR abbreviation + group
const POSITION_MAP: Record<string, { abbr: string; group: string; order: number }> = {
  Goalkeeper:           { abbr: "GR",  group: "Goleiros",     order: 0 },
  Defence:              { abbr: "DEF", group: "Defensores",   order: 1 },
  "Centre-Back":        { abbr: "ZAG", group: "Defensores",   order: 1 },
  "Left-Back":          { abbr: "LE",  group: "Defensores",   order: 1 },
  "Right-Back":         { abbr: "LD",  group: "Defensores",   order: 1 },
  Midfield:             { abbr: "MEI", group: "Meias",        order: 2 },
  "Defensive Midfield": { abbr: "VOL", group: "Meias",        order: 2 },
  "Central Midfield":   { abbr: "MEI", group: "Meias",        order: 2 },
  "Attacking Midfield": { abbr: "MAI", group: "Meias",        order: 2 },
  Offence:              { abbr: "ATA", group: "Atacantes",    order: 3 },
  "Left Winger":        { abbr: "PE",  group: "Atacantes",    order: 3 },
  "Right Winger":       { abbr: "PD",  group: "Atacantes",    order: 3 },
  "Centre-Forward":     { abbr: "CA",  group: "Atacantes",    order: 3 },
  "Secondary Striker":  { abbr: "SA",  group: "Atacantes",    order: 3 },
};

function getPos(position: string | null) {
  if (!position) return { abbr: "—", group: "Outros", order: 4 };
  return POSITION_MAP[position] ?? { abbr: position.slice(0, 3).toUpperCase(), group: "Outros", order: 4 };
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();

  // Group players by position group
  const grouped = team.players.reduce<Record<string, typeof team.players>>((acc, p) => {
    const { group } = getPos(p.position);
    acc[group] ??= [];
    acc[group].push(p);
    return acc;
  }, {});

  const groupOrder = ["Goleiros", "Defensores", "Meias", "Atacantes", "Outros"];
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => groupOrder.indexOf(a) - groupOrder.indexOf(b)
  );

  return (
    <div className="px-12 pt-12 pb-24 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-[11px] text-[#6B7280]">
        <Link href="/" className="hover:text-[#C8A96B] transition-colors">Início</Link>
        <span>/</span>
        <Link href="/teams" className="hover:text-[#C8A96B] transition-colors">Seleções</Link>
        <span>/</span>
        <span className="text-[#F3F4F6]">{team.name}</span>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-white/[0.03] border border-white/[0.07] p-10 mb-10">
        {/* Decorative TLA watermark */}
        <div
          className="absolute right-0 bottom-0 font-extrabold text-white/[0.04] leading-none tracking-[-0.06em] select-none pointer-events-none"
          style={{ fontSize: "clamp(120px, 18vw, 220px)" }}
        >
          {team.tla}
        </div>

        <div className="relative z-10 flex items-center gap-10">
          {/* Crest */}
          <div className="flex-shrink-0">
            {team.logo ? (
              <Image
                src={team.logo}
                alt={team.name}
                width={120}
                height={120}
                className="object-contain drop-shadow-lg"
                unoptimized
                priority
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-white/[0.06] flex items-center justify-center text-[18px] font-bold text-[#6B7280]">
                {team.tla}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-[9px] font-semibold tracking-[0.38em] uppercase text-[#C8A96B]/55">
              FIFA World Cup 2026
            </p>
            <h1
              className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6] mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
            >
              {team.name}
            </h1>

            <div className="flex flex-wrap gap-6">
              {team.country && (
                <Stat label="País" value={team.country} />
              )}
              {team.founded && (
                <Stat label="Fundação" value={String(team.founded)} />
              )}
              {team.venue && (
                <Stat label="Estádio" value={team.venue} />
              )}
              <Stat label="Jogadores" value={String(team._count.players)} />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px bg-white/[0.06]" />

      {/* Squad */}
      <div>
        <h2 className="mb-6 text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
          Elenco
        </h2>

        <div className="flex flex-col gap-8">
          {sortedGroups.map(([group, players]) => (
            <div key={group}>
              <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">
                {group}
              </p>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {players.map((player) => {
                  const { abbr } = getPos(player.position);
                  const age = calcAge(player.dateOfBirth);
                  return (
                    <div
                      key={player.id}
                      className="group flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-[14px] px-4 py-3 hover:border-[#C8A96B]/25 transition-colors cursor-default"
                    >
                      {/* Position badge */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-white/[0.06] flex items-center justify-center">
                        <span className="text-[9px] font-extrabold tracking-[0.04em] text-[#C8A96B]">
                          {abbr}
                        </span>
                      </div>

                      {/* Name + age */}
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#F3F4F6] truncate leading-tight">
                          {player.name}
                        </div>
                        {age !== null && (
                          <div className="text-[10px] text-[#6B7280]">{age} anos</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-[0.22em] uppercase text-[#6B7280] mb-0.5">
        {label}
      </div>
      <div className="text-[14px] font-semibold text-[#F3F4F6]">{value}</div>
    </div>
  );
}
