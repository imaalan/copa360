export const runtime = "nodejs";
// Hobby: 60s max — may be tight for 1200+ player upserts; upgrade to Pro for 300s
export const maxDuration = 60;

import { prisma } from "@/lib/prisma";

const API_BASE = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org ${path} → ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function GET(req: Request) {
  // Vercel injects this header automatically on cron calls.
  // Manual calls without the secret are rejected.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  try {
    // ── 1. Competition ──────────────────────────────────────────────────────
    const comp = await apiFetch("/competitions/WC");
    const season = comp.currentSeason as Record<string, unknown>;

    const competition = await prisma.competition.upsert({
      where: { externalId: Number(comp.id) },
      update: {},
      create: {
        externalId: Number(comp.id),
        name: String(comp.name),
        code: String(comp.code),
        areaName: "World",
        emblem: comp.emblem ? String(comp.emblem) : null,
        type: String(comp.type),
        season: String((season as Record<string, unknown>).id ?? ""),
        startDate: season.startDate ? new Date(String(season.startDate)) : null,
        endDate: season.endDate ? new Date(String(season.endDate)) : null,
      },
    });

    // ── 2. Teams + Squads ───────────────────────────────────────────────────
    const teamsData = await apiFetch("/competitions/WC/teams");
    const teams = teamsData.teams as Array<Record<string, unknown>>;

    let teamsUpserted = 0;
    let playersUpserted = 0;

    for (const t of teams) {
      const team = await prisma.team.upsert({
        where: { externalId: Number(t.id) },
        update: {
          name: String(t.name),
          tla: t.tla ? String(t.tla) : null,
          logo: t.crest ? String(t.crest) : null,
          country: String((t.area as Record<string, unknown>)?.name ?? ""),
          founded: t.founded ? Number(t.founded) : null,
          venue: t.venue ? String(t.venue) : null,
        },
        create: {
          externalId: Number(t.id),
          name: String(t.name),
          code: String((t.area as Record<string, unknown>)?.code ?? ""),
          tla: t.tla ? String(t.tla) : null,
          logo: t.crest ? String(t.crest) : null,
          country: String((t.area as Record<string, unknown>)?.name ?? ""),
          founded: t.founded ? Number(t.founded) : null,
          venue: t.venue ? String(t.venue) : null,
        },
      });
      teamsUpserted++;

      const squad = (t.squad as Array<Record<string, unknown>>) ?? [];
      for (const p of squad) {
        await prisma.player.upsert({
          where: { externalId: Number(p.id) },
          update: {
            name: String(p.name),
            position: p.position ? String(p.position) : null,
            nationality: p.nationality ? String(p.nationality) : null,
            dateOfBirth: p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null,
            shirtNumber: p.shirtNumber != null ? Number(p.shirtNumber) : null,
            teamId: team.id,
          },
          create: {
            externalId: Number(p.id),
            name: String(p.name),
            position: p.position ? String(p.position) : null,
            nationality: p.nationality ? String(p.nationality) : null,
            dateOfBirth: p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null,
            shirtNumber: p.shirtNumber != null ? Number(p.shirtNumber) : null,
            teamId: team.id,
          },
        });
        playersUpserted++;
      }
    }

    // ── 3. Matches ──────────────────────────────────────────────────────────
    const matchesData = await apiFetch("/competitions/WC/matches");
    const matches = matchesData.matches as Array<Record<string, unknown>>;

    const dbTeams = await prisma.team.findMany({ select: { id: true, externalId: true } });
    const teamMap = new Map(dbTeams.filter((t) => t.externalId).map((t) => [t.externalId!, t.id]));

    let matchesUpserted = 0;
    for (const m of matches) {
      const home = m.homeTeam as Record<string, unknown>;
      const away = m.awayTeam as Record<string, unknown>;
      const fullTime = (m.score as Record<string, unknown>)?.fullTime as Record<string, unknown> | null;

      await prisma.match.upsert({
        where: { externalId: Number(m.id) },
        update: {
          status: String(m.status),
          homeScore: fullTime?.home != null ? Number(fullTime.home) : null,
          awayScore: fullTime?.away != null ? Number(fullTime.away) : null,
        },
        create: {
          externalId: Number(m.id),
          utcDate: new Date(String(m.utcDate)),
          status: String(m.status),
          matchday: m.matchday != null ? Number(m.matchday) : null,
          stage: m.stage ? String(m.stage) : null,
          group: m.group ? String(m.group) : null,
          homeTeamId: home?.id ? (teamMap.get(Number(home.id)) ?? null) : null,
          awayTeamId: away?.id ? (teamMap.get(Number(away.id)) ?? null) : null,
          homeScore: fullTime?.home != null ? Number(fullTime.home) : null,
          awayScore: fullTime?.away != null ? Number(fullTime.away) : null,
          venue: m.venue ? String(m.venue) : null,
          competitionId: competition.id,
        },
      });
      matchesUpserted++;
    }

    return Response.json({
      ok: true,
      durationMs: Date.now() - started,
      upserted: { teams: teamsUpserted, players: playersUpserted, matches: matchesUpserted },
    });
  } catch (err) {
    console.error("[cron/seed]", err);
    return Response.json(
      { ok: false, error: String(err), durationMs: Date.now() - started },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
