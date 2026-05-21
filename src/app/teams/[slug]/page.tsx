import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SquadWithPopup from "@/components/SquadWithPopup";
import CoachCard from "@/components/CoachCard";
import { getPosition, GROUP_ORDER } from "@/lib/positions";

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
      players: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, position: true, dateOfBirth: true, photo: true },
      },
      coach: {
        select: { id: true, name: true, nationality: true, photo: true, contractStart: true },
      },
      _count: { select: { players: true } },
    },
  });
}



export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();

  const grouped = team.players.reduce<Record<string, typeof team.players>>((acc, p) => {
    const { group } = getPosition(p.position);
    acc[group] ??= [];
    acc[group].push(p);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  );

  return (
    <div className="animate-page-in px-4 md:px-12 pt-8 md:pt-12 pb-24 max-w-[1440px] mx-auto">
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

      {/* Coach */}
      {team.coach && (
        <div className="mb-10">
          <h2 className="mb-4 text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">Técnico</h2>
          <CoachCard coach={team.coach} />
        </div>
      )}

      {/* Squad */}
      <div>
        <h2 className="mb-6 text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
          Elenco
        </h2>

        <SquadWithPopup
          groups={sortedGroups.map(([group, players]) => ({ group, players }))}
        />
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
