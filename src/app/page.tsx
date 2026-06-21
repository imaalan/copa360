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

// Siglas FIFA — formato real do banco (normPosition). Strings legadas não casam mais.
const ATTACK_POSITIONS = ["LW", "RW", "CF", "ST", "SS", "CAM", "FWD"];


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
    GK: "GOL",
    CB: "ZAG", SW: "ZAG", RB: "LD", LB: "LE", RWB: "LD", LWB: "LE", DEF: "DEF",
    CDM: "VOL", CM: "MEI", CAM: "MEI", RM: "MEI", LM: "MEI", MID: "MEI",
    RW: "PTA", LW: "PTA", CF: "ATA", ST: "ATA", SS: "ATA", FWD: "ATA",
  };
  return map[pos ?? ""] ?? "JOG";
}

export default async function Home() {
  const now = new Date();
  const [featuredPlayers, allTeams, nextMatch, playedCount] = await Promise.all([
    getFeaturedPlayers(),
    prisma.team.findMany({
      select: { id: true, tla: true, name: true, logo: true },
      orderBy: { name: "asc" },
    }),
    // Próximo jogo direto do banco — nada de data hardcoded (a abertura é 11/06, não 19/06).
    prisma.match.findFirst({
      where: { utcDate: { gt: now } },
      orderBy: { utcDate: "asc" },
      select: { utcDate: true },
    }),
    prisma.match.count({ where: { utcDate: { lte: now } } }),
  ]);

  const tournamentStarted = playedCount > 0;
  const countdownLabel = nextMatch
    ? `${tournamentStarted ? "Próximo jogo" : "Abertura"} · ${nextMatch.utcDate.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      })}`
    : "FIFA World Cup 2026";

  return (
    <>
      {/* ── HERO + COUNTDOWN ── */}
      <section className="px-4 md:px-12 pt-14 md:pt-24 pb-16">
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
            {countdownLabel}
          </p>
          <CountdownTimer targetIso={nextMatch?.utcDate.toISOString()} />
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-4 md:mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── FEATURED PLAYERS ── */}
      <section className="px-4 md:px-12 pb-16">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-[860px]">
          {featuredPlayers.map((player) => {
            if (!player) return null;
            const tla = player.team?.tla ?? "";
            const posAbbr = posLabel(player.position);
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group bg-white/[0.03] border border-white/[0.07] rounded-[28px] p-5 hover:border-[#C8A96B]/30 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all duration-200 no-underline"
              >
                {/* Photo or initials */}
                <div className="aspect-square rounded-[14px] bg-white/[0.05] overflow-hidden mb-3.5 relative flex items-center justify-center">
                  {player.photo && (
                    <Image
                      src={player.photo}
                      alt={player.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
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

      {/* ── 7A0 CARD ── */}
      <section className="px-4 md:px-12 pb-16">
        <a
          href="https://7a0.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/[0.03] border border-[#C8A96B]/20 rounded-[24px] px-7 md:px-10 py-8 hover:border-[#C8A96B]/40 hover:bg-white/[0.05] transition-all duration-200 no-underline max-w-[860px]"
        >
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
              Brincar de Técnico
            </p>
            <h2
              className="font-extrabold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6] mb-3"
              style={{ fontSize: "clamp(28px, 3.5vw, 42px)" }}
            >
              Role o dado.
            </h2>
            <p className="text-[13px] font-light leading-[1.7] text-[#6B7280] max-w-[420px]">
              Monte sua seleção dos sonhos
            </p>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#6B7280]/70 max-w-[420px]">
              Sai uma seleção e uma Copa. Escale um craque que esteve lá, complete os 11 e simule — seu time faz 7 a 0?
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-[#C8A96B]/10 border border-[#C8A96B]/25 group-hover:bg-[#C8A96B]/18 transition-colors">
            <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#C8A96B]">
              Jogar agora ↗
            </span>
          </div>
        </a>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-4 md:mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── TEAM MOSAIC ── */}
      <section className="px-4 md:px-12 pb-20">
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
      <footer className="mx-4 md:mx-12 border-t border-white/[0.06] py-7 flex items-center justify-between">
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
