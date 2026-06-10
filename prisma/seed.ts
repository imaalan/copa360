/**
 * prisma/seed.ts — Sincronização manual via `npm run db:seed`.
 *
 * Agora é um wrapper fino de src/lib/sync-core.ts (a MESMA lógica do cron
 * diário). Garantias:
 *   - NÃO apaga fotos/enriquecimento (photo, clube, bio, troféus, stats);
 *   - NÃO reverte nomes melhorados pelo enrich-names;
 *   - posições sempre normalizadas para sigla FIFA (normPosition).
 */

import { PrismaClient } from "@prisma/client";
import { syncWorldCupData } from "../src/lib/sync-core";

const prisma = new PrismaClient();

async function main() {
  console.log("🌍 Copa360 seed iniciado...\n");

  const result = await syncWorldCupData(prisma, { log: console.log });

  const [totalTeams, totalPlayers, totalMatches] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
  ]);

  console.log(`\n🏆 Seed concluído!`);
  console.log(
    `   Sincronizados: ${result.teams} seleções · ${result.players} jogadores · ${result.matches} jogos`
  );
  console.log(`   Totais no banco: ${totalTeams} seleções · ${totalPlayers} jogadores · ${totalMatches} jogos`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
