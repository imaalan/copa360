/**
 * Bulk photo enrichment via TheSportsDB (free, no key).
 * Usage:
 *   npx tsx scripts/enrich-photos.ts              # all players without photo
 *   npx tsx scripts/enrich-photos.ts --limit=50   # first 50
 *   npx tsx scripts/enrich-photos.ts --dry-run    # preview only, no DB writes
 *   npx tsx scripts/enrich-photos.ts --from=500   # start from player id > 500
 *
 * Rate: ~200ms between requests (~5 req/s). Full run ~4 min for 1200 players.
 * TheSportsDB is free with no documented daily cap.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELAY_MS = 700;       // ~85 req/min, below SDB free-tier limit of 100/min
const RETRY_DELAY = 5000;   // wait 5s before retrying on empty response
const BATCH_SIZE = 50;
const SDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

// ── CLI args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const LIMIT = (() => {
  const a = argv.find((x) => x.startsWith("--limit="));
  return a ? parseInt(a.split("=")[1], 10) : Infinity;
})();
const FROM_ID = (() => {
  const a = argv.find((x) => x.startsWith("--from="));
  return a ? parseInt(a.split("=")[1], 10) : 0;
})();

// ── String helpers ────────────────────────────────────────────────────────────

function normStr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function normNat(s: string): string {
  return normStr(s).replace(/ian$|ese$|ish$|an$/, "");
}

function nameMatch(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const na = normStr(a), nb = normStr(b);
  if (na === nb || nb.includes(na) || na.includes(nb)) return true;
  const aLast = na.split(" ").slice(-1)[0];
  const bLast = nb.split(" ").slice(-1)[0];
  return aLast.length > 3 && aLast === bLast;
}

function nationalityMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normNat(a), nb = normNat(b);
  return na === nb || na.startsWith(nb.slice(0, 4)) || nb.startsWith(na.slice(0, 4));
}

// ── TheSportsDB ───────────────────────────────────────────────────────────────

type SDBPlayer = {
  strPlayer: string;
  strNationality: string;
  strThumb?: string;
  strCutout?: string;
  strTeam?: string;
  strTeamLogo?: string;
};

async function fetchFromSportsDB(
  name: string,
  nationality: string | null
): Promise<{ photo: string | null; club: string | null; clubLogo: string | null } | null> {
  const url = `${SDB_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`;
  let players: SDBPlayer[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json() as { player?: SDBPlayer[] };
      players = data.player ?? [];
      if (players.length > 0) break;
      if (attempt === 0) await sleep(RETRY_DELAY); // empty = possible rate limit, wait and retry
    } catch {
      break;
    }
  }

  try {
    if (!players.length) return null;

    const match = players.find(
      (p) => nameMatch(name, p.strPlayer) && nationalityMatch(nationality, p.strNationality)
    ) ?? players.find((p) => nameMatch(name, p.strPlayer));

    if (!match) return null;

    const thumb = match.strThumb ?? match.strCutout ?? null;
    const photo = thumb && !thumb.includes("placeholder") ? thumb : null;

    return {
      photo,
      club: match.strTeam ?? null,
      clubLogo: match.strTeamLogo ?? null,
    };
  } catch {
    return null;
  }
}


// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bar(done: number, total: number, width = 20): string {
  const filled = Math.round((done / total) * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const totalToProcess = await prisma.player.count({
    where: { photo: null, id: { gt: FROM_ID } },
  });

  const limit = Math.min(totalToProcess, LIMIT);

  console.log(`\nCopa360 · Photo Enrichment`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Players without photo : ${totalToProcess}`);
  console.log(`Processing limit      : ${limit === Infinity ? "all" : limit}`);
  console.log(`Dry run               : ${DRY_RUN}`);
  console.log(`From ID               : ${FROM_ID}`);
  console.log(`Estimated time        : ~${Math.ceil((limit * DELAY_MS) / 60000)} min (at ${DELAY_MS}ms/req)\n`);

  let lastId = FROM_ID;
  let processed = 0;
  let found = 0;
  let notFound = 0;
  let errors = 0;

  while (processed < limit) {
    const batch = await prisma.player.findMany({
      where: { photo: null, id: { gt: lastId } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: { id: true, name: true, nationality: true },
    });

    if (!batch.length) break;

    for (const player of batch) {
      if (processed >= limit) break;

      const pct = Math.round(((processed + 1) / limit) * 100);
      process.stdout.write(
        `\r${bar(processed, limit)} ${pct}%  [${processed + 1}/${limit}] ${player.name.padEnd(28).slice(0, 28)} `
      );

      try {
        const result = await fetchFromSportsDB(player.name, player.nationality);

        if (result) {
          const updateData: Record<string, unknown> = {};
          if (result.photo) updateData.photo = result.photo;
          if (result.club) updateData.currentClub = result.club;
          if (result.clubLogo) updateData.currentClubLogo = result.clubLogo;

          if (Object.keys(updateData).length && !DRY_RUN) {
            await prisma.player.update({ where: { id: player.id }, data: updateData });
          }

          if (result.photo) found++;
          else notFound++;
        } else {
          notFound++;
        }
      } catch {
        errors++;
      }

      lastId = player.id;
      processed++;
      await sleep(DELAY_MS);
    }
  }

  const hitRate = processed > 0 ? Math.round((found / processed) * 100) : 0;
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Done!`);
  console.log(`  Processed : ${processed}`);
  console.log(`  Found     : ${found} (${hitRate}%)`);
  console.log(`  Not found : ${notFound}`);
  console.log(`  Errors    : ${errors}`);
  if (DRY_RUN) console.log(`\n  (dry-run — no writes made)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
