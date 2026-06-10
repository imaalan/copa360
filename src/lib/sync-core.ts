/**
 * sync-core.ts — Sincronização de dados da football-data.org.
 *
 * FONTE ÚNICA usada por `prisma/seed.ts` (manual) e `/api/cron/seed` (diário).
 * Antes existiam duas implementações divergentes — e a do seed manual
 * sobrescrevia `photo: null` e posições cruas a cada execução, destruindo
 * todo o enriquecimento (TheSportsDB / API-Football / overrides).
 *
 * Contrato de preservação (campos que o sync NUNCA toca em update):
 *   photo, photoSource, photoVerified, photoUpdatedAt, sdbPlayerId,
 *   apiFootballId, currentClub, currentClubLogo, bio, trophies, stats*,
 *   name (preserva o trabalho do enrich-names; a fonte só define o name no create).
 *
 * Trade-off documentado: se a football-data corrigir um nome na origem, a
 * correção não propaga automaticamente — rode `enrich:names --all` ou ajuste
 * manualmente. Para a janela da Copa, enriquecimento > flutuação da fonte.
 */

import type { PrismaClient } from "@prisma/client";
import { normPosition } from "./positions";

const API_BASE = "https://api.football-data.org/v4";

export type SyncResult = {
  competitionId: number;
  teams: number;
  players: number;
  matches: number;
};

type Logger = (msg: string) => void;

async function apiFetch(path: string, apiKey: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org ${path} → ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function syncWorldCupData(
  prisma: PrismaClient,
  opts: { apiKey?: string; log?: Logger } = {}
): Promise<SyncResult> {
  const apiKey = opts.apiKey ?? process.env.FOOTBALL_DATA_API_KEY ?? "";
  const log: Logger = opts.log ?? (() => {});

  // ── 1. Competition ─────────────────────────────────────────────────────────
  log("📋 Buscando competição FIFA World Cup 2026...");
  const comp = await apiFetch("/competitions/WC", apiKey);
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
  log(`   ✅ ${competition.name} (id: ${competition.id})\n`);

  // ── 2. Teams + Squads ──────────────────────────────────────────────────────
  log("⚽ Buscando seleções + elencos...");
  const teamsData = await apiFetch("/competitions/WC/teams", apiKey);
  const teams = teamsData.teams as Array<Record<string, unknown>>;
  log(`   ${teams.length} seleções encontradas\n`);

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
      const basePlayer = {
        position: normPosition(p.position ? String(p.position) : null) ?? "MID",
        nationality: p.nationality ? String(p.nationality) : null,
        dateOfBirth: p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null,
        shirtNumber: p.shirtNumber != null ? Number(p.shirtNumber) : null,
        teamId: team.id,
      };

      await prisma.player.upsert({
        where: { externalId: Number(p.id) },
        // ⚠️ update NÃO inclui name, photo nem qualquer campo de enriquecimento.
        update: basePlayer,
        create: {
          externalId: Number(p.id),
          name: String(p.name),
          ...basePlayer,
        },
      });
      playersUpserted++;
    }
    log(`   ✅ ${team.name} (${team.tla ?? "—"}) — ${squad.length} jogadores`);
  }

  // ── 3. Matches ─────────────────────────────────────────────────────────────
  log("\n📅 Buscando jogos...");
  const matchesData = await apiFetch("/competitions/WC/matches", apiKey);
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
        utcDate: new Date(String(m.utcDate)),
        // Times definidos conforme o chaveamento avança (grupos → mata-mata).
        homeTeamId: home?.id ? (teamMap.get(Number(home.id)) ?? null) : null,
        awayTeamId: away?.id ? (teamMap.get(Number(away.id)) ?? null) : null,
        homeScore: fullTime?.home != null ? Number(fullTime.home) : null,
        awayScore: fullTime?.away != null ? Number(fullTime.away) : null,
        venue: m.venue ? String(m.venue) : null,
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
  log(`   ✅ ${matchesUpserted} jogos sincronizados`);

  return {
    competitionId: competition.id,
    teams: teamsUpserted,
    players: playersUpserted,
    matches: matchesUpserted,
  };
}
