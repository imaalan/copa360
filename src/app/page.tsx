import Link from "next/link";
import Image from "next/image";
import CountdownTimer from "@/components/CountdownTimer";
import TeamMosaic from "@/components/TeamMosaic";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

const FEATURED_STARS: Record<string, string[]> = {
  BRA: ["Vinicius Junior", "Rodrygo", "Endrick"],
  FRA: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé"],
  ARG: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez"],
  ENG: ["Jude Bellingham", "Harry Kane", "Phil Foden"],
};

const ATTACK_POSITIONS = [
  "Left Winger",
  "Right Winger",
  "Centre-Forward",
  "Attacking Midfield",
  "Secondary Striker",
  "Offence",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function getFeaturedPlayers() {
  const tlas = ["BRA", "FRA", "ARG", "ENG"];
  const players = await prisma.player.findMany({
    where: { team: { tla: { in: tlas } } },
    include: { team: { select: { id: true, tla: true, name: true, logo: true } } },
    orderBy: { name: "asc" },
  });

  return tlas.map((tla) => {
    const squad = players.filter((p) => p.team?.tla === tla);
    const stars = FEATURED_STARS[tla] ?? [];

    const star = stars
      .map((name) => squad.find((p) => p.name === name))
      .find(Boolean);

    return (
      star ??
      squad.find((p) => ATTACK_POSITIONS.includes(p.position ?? "")) ??
      squad[0]
    );
  }).filter(Boolean);
}

function posLabel(pos: string | null): string {
  const map: Record<string, string> = {
    "Left Winger": "ATA",
    "Right Winger": "ATA",
    "Centre-Forward": "ATA",
    "Attacking Midfield": "MEI",
    "Secondary Striker": "ATA",
    Offence: "ATA",
    Midfield: "MEI",
    "Central Midfield": "MEI",
    "Defensive Midfield": "VOL",
    Defence: "DEF",
    "Centre-Back": "ZAG",
    "Left-Back": "LE",
    "Right-Back": "LD",
    Goalkeeper: "GR",
  };
  return map[pos ?? ""] ?? "JOG";
}

export default async function Home() {
  const [featuredPlayers, allTeams] = await Promise.all([
    getFeaturedPlayers(),
    prisma.team.findMany({
      select: { id: true, tla: true, name: true, logo: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      {/* ── HERO + COUNTDOWN ── */}
      <section className="px-12 pt-24 pb-16">
        <p className="mb-5 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          Contagem regressiva · FIFA World Cup 2026
        </p>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          A Copa do Mundo
          <br />
          <em className="not-italic text-[#C8A96B]">como você nunca viu.</em>
        </h1>
        <p className="mt-5 max-w-[480px] text-base font-light leading-[1.7] text-[#6B7280]">
          Explore jogadores, seleções, estatísticas
          <br />e histórias da Copa de 2026.
        </p>

        <div className="mt-12">
          <p className="mb-5 text-[9px] font-semibold tracking-[0.38em] uppercase text-white/20">
            Abertura · 19 de junho de 2026
          </p>
          <CountdownTimer />
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── FEATURED PLAYERS ── */}
      <section className="px-12 pb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
            Jogadores em Destaque
          </h2>
          <Link
            href="/players"
            className="text-[11px] font-semibold text-[#C8A96B]/70 hover:text-[#C8A96B] transition-colors no-underline"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2.5 max-w-[860px]">
          {featuredPlayers.map((player) => {
            if (!player) return null;
            const tla = player.team?.tla ?? "";
            const posAbbr = posLabel(player.position);
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group bg-white/[0.03] border border-white/[0.07] rounded-[28px] p-5 hover:border-[#C8A96B]/30 transition-colors no-underline"
              >
                {/* Photo or initials */}
                <div className="aspect-square rounded-[14px] bg-white/[0.05] overflow-hidden mb-3.5 relative flex items-center justify-center">
                  {player.photo ? (
                    <Image
                      src={player.photo}
                      alt={player.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[28px] font-extrabold text-white/20 tracking-[-0.04em]">
                      {getInitials(player.name)}
                    </span>
                  )}
                </div>

                <div className="text-[14px] font-bold tracking-[-0.01em] text-[#F3F4F6] leading-tight mb-0.5">
                  {player.name}
                </div>
                <div className="text-[10px] text-[#6B7280] mb-3.5">
                  {posAbbr} · {tla}
                </div>

                {/* Team logo */}
                {player.team?.logo && (
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={player.team.logo}
                      alt={player.team.name ?? ""}
                      width={16}
                      height={16}
                      className="object-contain opacity-60"
                      unoptimized
                    />
                    <span className="text-[9px] text-white/30 font-semibold tracking-wide uppercase">
                      {player.team.name}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── TEAM MOSAIC ── */}
      <section className="px-12 pb-20">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
            Seleções
          </h2>
          <Link
            href="/teams"
            className="text-[11px] font-semibold text-[#C8A96B]/70 hover:text-[#C8A96B] transition-colors no-underline"
          >
            48 equipes →
          </Link>
        </div>

        <TeamMosaic teams={allTeams} />
      </section>

      {/* ── FOOTER ── */}
      <footer className="mx-12 border-t border-white/[0.06] py-7 flex items-center justify-between">
        <span className="text-[14px] font-extrabold tracking-[-0.02em] text-white/18">
          COPA<span className="text-[#C8A96B]/25">360</span>
        </span>
        <span className="text-[10px] text-white/12 tracking-[0.08em]">
          FIFA World Cup 2026 &nbsp;·&nbsp; EUA · CANADÁ · MÉXICO
        </span>
      </footer>
    </>
  );
}
