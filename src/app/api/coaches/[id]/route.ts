import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const coachId = Number(id);
  if (!Number.isFinite(coachId) || coachId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: {
      team: { select: { id: true, tla: true, name: true, logo: true } },
    },
  });

  if (!coach) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats =
    coach.statsMatches != null && coach.statsMatches > 0
      ? {
          matches: coach.statsMatches,
          wins: coach.statsWins ?? 0,
          draws: coach.statsDraws ?? 0,
          losses: coach.statsLosses ?? 0,
          winRate: Math.round(((coach.statsWins ?? 0) / coach.statsMatches) * 100),
        }
      : null;

  return NextResponse.json({
    id: coach.id,
    name: coach.name,
    nationality: coach.nationality,
    dateOfBirth: coach.dateOfBirth,
    photo: coach.photo,
    contractStart: coach.contractStart,
    contractUntil: coach.contractUntil,
    team: coach.team,
    stats,
    trophies: (coach.trophies as { league: string; country: string; season: string; place: string }[]) ?? [],
  });
}
