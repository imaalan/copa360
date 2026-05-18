import { prisma } from "@/lib/prisma";
import MatchesView from "@/components/MatchesView";

export const revalidate = 300;

export const metadata = {
  title: "Jogos — Copa360",
  description: "Calendário completo dos 104 jogos da FIFA World Cup 2026.",
};

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    orderBy: { utcDate: "asc" },
    include: {
      homeTeam: { select: { name: true, tla: true, logo: true } },
      awayTeam: { select: { name: true, tla: true, logo: true } },
    },
  });

  return (
    <section className="px-4 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="mb-10">
        <p className="mb-3 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          FIFA World Cup 2026
        </p>
        <div className="flex items-baseline justify-between">
          <h1
            className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
            style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
          >
            Jogos
          </h1>
          <span className="text-[11px] font-semibold text-[#6B7280]">
            {matches.length} partidas
          </span>
        </div>
        <div className="mt-4 h-px bg-white/[0.06]" />
      </div>

      <MatchesView matches={matches} />
    </section>
  );
}
