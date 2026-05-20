import { PrismaClient } from "@prisma/client";
import { normPosition } from "../src/lib/positions";

const prisma = new PrismaClient();
const API_BASE = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY_TLAS = args.find(a => a.startsWith("--tlas="))
  ?.split("=")[1]
  .toUpperCase()
  .split(",")
  .map(s => s.trim());

async function main() {
  console.log(`\n⚽  Copa360 — sync-squads (fonte: football-data.org)`);
  if (DRY_RUN) console.log("   [dry-run — sem escrita no banco]\n");
  if (ONLY_TLAS) console.log(`   Filtrando: ${ONLY_TLAS.join(", ")}\n`);

  const res = await fetch(`${API_BASE}/competitions/WC/teams`, {
    headers: { "X-Auth-Token": API_KEY },
  });
  if (!res.ok) throw new Error(`API /competitions/WC/teams → ${res.status}`);
  const data = (await res.json()) as { teams: Array<Record<string, unknown>> };

  const teams = ONLY_TLAS
    ? data.teams.filter(t => ONLY_TLAS!.includes(String(t.tla ?? "").toUpperCase()))
    : data.teams;

  console.log(`   ${teams.length} seleções para processar\n`);

  let totalPlayers = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalNotFound = 0;
  const wrongPositions: Array<{ team: string; name: string; old: string | null; raw: string; normalized: string }> = [];

  for (const t of teams) {
    const tla = String(t.tla ?? "");
    const squad = (t.squad as Array<Record<string, unknown>>) ?? [];
    let teamUpdated = 0;

    for (const p of squad) {
      totalPlayers++;
      const externalId = Number(p.id);
      const rawPos = p.position ? String(p.position) : null;
      const normalized = normPosition(rawPos) ?? "MID";

      const dbPlayer = await prisma.player.findUnique({
        where: { externalId },
        select: { id: true, name: true, position: true },
      });

      if (!dbPlayer) {
        totalNotFound++;
        continue;
      }

      if (dbPlayer.position === normalized) {
        totalUnchanged++;
        continue;
      }

      wrongPositions.push({
        team: tla,
        name: dbPlayer.name,
        old: dbPlayer.position,
        raw: rawPos ?? "null",
        normalized,
      });

      if (!DRY_RUN) {
        await prisma.player.update({
          where: { id: dbPlayer.id },
          data: { position: normalized },
        });
      }
      teamUpdated++;
      totalUpdated++;
    }

    if (teamUpdated > 0) {
      console.log(`   ${tla}: ${teamUpdated} posição(ões) corrigida(s)`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Jogadores verificados : ${totalPlayers}`);
  console.log(`   Não encontrados no DB : ${totalNotFound}`);
  console.log(`   Sem alteração         : ${totalUnchanged}`);
  console.log(`   ${DRY_RUN ? "Seriam corrigidos" : "Corrigidos"}     : ${totalUpdated}`);

  if (wrongPositions.length > 0) {
    console.log("\n   Correções aplicadas:");
    for (const w of wrongPositions) {
      console.log(`     [${w.team}] ${w.name}: "${w.old}" → "${w.normalized}" (API: "${w.raw}")`);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
