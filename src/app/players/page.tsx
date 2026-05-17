import { prisma } from "@/lib/prisma";
import PlayersGrid from "@/components/PlayersGrid";

export const revalidate = 3600;

export const metadata = {
  title: "Jogadores — Copa360",
  description: "Explore os 1.200+ jogadores da FIFA World Cup 2026.",
};

export default async function PlayersPage() {
  const [players, teams] = await Promise.all([
    prisma.player.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, position: true, nationality: true,
        dateOfBirth: true, photo: true,
        team: { select: { id: true, name: true, tla: true, logo: true } },
      },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, tla: true },
    }),
  ]);

  return (
    <section className="px-12 pt-16 pb-24">
      <div className="mb-10">
        <p className="mb-3 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          FIFA World Cup 2026
        </p>
        <div className="flex items-baseline justify-between">
          <h1
            className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
            style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
          >
            Jogadores
          </h1>
          <span className="text-[11px] font-semibold text-[#6B7280]">
            {players.length} atletas
          </span>
        </div>
        <div className="mt-4 h-px bg-white/[0.06]" />
      </div>

      <PlayersGrid players={players} teams={teams} />
    </section>
  );
}
