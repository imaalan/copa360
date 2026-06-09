import { PrismaClient } from "@prisma/client";
import https from "https";
import { URL } from "url";

const prisma = new PrismaClient();
const API_BASE = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

const agent = new https.Agent({ keepAlive: false });

function apiFetch(path: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const u = new URL(`${API_BASE}${path}`);
    const req = https.get(
      { hostname: u.hostname, path: u.pathname + u.search, headers: { "X-Auth-Token": API_KEY }, agent },
      res => {
        const chunks: Buffer[] = [];
        res.on("data", c => chunks.push(c as Buffer));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`API ${path} → ${res.statusCode}`));
            return;
          }
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function main() {
  console.log("\n🧹  Copa360 — cleanup-squads");
  console.log("    Remove jogadores fora do elenco atual da API\n");

  const data = await apiFetch("/competitions/WC/teams");
  const teams = data.teams as Array<Record<string, unknown>>;

  let totalRemoved = 0;
  let teamsFixed = 0;

  for (const t of teams) {
    const tla = String(t.tla ?? "");
    const squad = (t.squad as Array<Record<string, unknown>>) ?? [];
    const validIds = squad.map(p => Number(p.id)).filter(n => !isNaN(n) && n > 0);

    const dbTeam = await prisma.team.findFirst({
      where: { externalId: Number(t.id) },
      select: { id: true },
    });
    if (!dbTeam) continue;

    const { count } = await prisma.player.deleteMany({
      where: {
        teamId: dbTeam.id,
        OR: [
          { externalId: null },
          { externalId: { notIn: validIds } },
        ],
      },
    });

    if (count > 0) {
      console.log(`   ${tla}: ${count} removido(s)`);
      totalRemoved += count;
      teamsFixed++;
    }
  }

  const remaining = await prisma.player.count();
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Seleções corrigidas : ${teamsFixed}`);
  console.log(`   Jogadores removidos : ${totalRemoved}`);
  console.log(`   Jogadores restantes : ${remaining}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
