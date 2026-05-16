import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const API_BASE = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function main() {
  console.log("🌍 Copa360 seed iniciado...\n");

  // 1. Competition
  console.log("📋 Buscando competição FIFA World Cup 2026...");
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
  console.log(`   ✅ ${competition.name} (id: ${competition.id})\n`);

  // 2. Teams + Players
  console.log("⚽ Buscando 48 seleções + elencos...");
  const teamsData = await apiFetch("/competitions/WC/teams");
  const teams = teamsData.teams as Array<Record<string, unknown>>;

  console.log(`   ${teams.length} seleções encontradas\n`);

  for (const t of teams) {
    const team = await prisma.team.upsert({
      where: { externalId: Number(t.id) },
      update: {
        name: String(t.name),
        code: String((t.area as Record<string, unknown>)?.code ?? ""),
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

    const squad = (t.squad as Array<Record<string, unknown>>) ?? [];
    let playerCount = 0;

    for (const p of squad) {
      await prisma.player.upsert({
        where: { externalId: Number(p.id) },
        update: {
          name: String(p.name),
          position: p.position ? String(p.position) : null,
          nationality: p.nationality ? String(p.nationality) : null,
          dateOfBirth: p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null,
          teamId: team.id,
        },
        create: {
          externalId: Number(p.id),
          name: String(p.name),
          position: p.position ? String(p.position) : null,
          nationality: p.nationality ? String(p.nationality) : null,
          dateOfBirth: p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null,
          teamId: team.id,
        },
      });
      playerCount++;
    }

    console.log(`   ✅ ${team.name} (${team.tla}) — ${playerCount} jogadores`);
  }

  const totalTeams = await prisma.team.count();
  const totalPlayers = await prisma.player.count();

  console.log(`\n🏆 Seed concluído!`);
  console.log(`   ${totalTeams} seleções no banco`);
  console.log(`   ${totalPlayers} jogadores no banco`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
