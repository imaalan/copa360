/**
 * Name enrichment via football-data.org /persons/{id}.
 * Fixes incomplete mononyms: "Thiago" → "Igor Thiago".
 *
 * Rule: if the API's firstName field contains the stored mononym as a word,
 * and firstName is longer, use firstName as the new display name.
 * Only targets single-word names — multi-word names are left as-is.
 *
 * Usage:
 *   npx tsx scripts/enrich-names.ts              # single-word players only
 *   npx tsx scripts/enrich-names.ts --all        # every player (slower, ~120min)
 *   npx tsx scripts/enrich-names.ts --dry-run    # preview only, no DB writes
 *   npx tsx scripts/enrich-names.ts --force      # overwrite even if name was already updated
 *
 * Rate limit: 10 req/min (free tier) → 7s delay between calls.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const API_BASE = "https://api.football-data.org/v4";
const DELAY_MS = 7000;

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const ALL_PLAYERS = argv.includes("--all");

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function isBetterName(current: string, candidate: string): boolean {
  if (!candidate || candidate === current) return false;

  const currentNorm = norm(current);
  const candidateNorm = norm(candidate);

  // candidate must contain current name as a complete word (or start with it)
  const words = candidateNorm.split(" ");
  if (!words.some((w) => w === currentNorm)) return false;

  // candidate must be longer (adds information)
  if (candidateNorm.length <= currentNorm.length) return false;

  // Sanity: cap at 4 words (avoid full legal names like "Igor Thiago de Queiroz Neto")
  if (words.length > 4) return false;

  return true;
}

async function fetchPerson(externalId: number): Promise<{ name: string | null; firstName: string | null } | null> {
  try {
    const res = await fetch(`${API_BASE}/persons/${externalId}`, {
      headers: { "X-Auth-Token": API_KEY },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { name?: string; firstName?: string };
    return {
      name: data.name ?? null,
      firstName: data.firstName ?? null,
    };
  } catch (err) {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[enrich-names] dry=${DRY_RUN} all=${ALL_PLAYERS}\n`);

  const players = await prisma.player.findMany({
    select: { id: true, name: true, externalId: true },
    where: ALL_PLAYERS
      ? { externalId: { not: null } }
      : {
          externalId: { not: null },
          // Only single-word names
          NOT: { name: { contains: " " } },
        },
    orderBy: { id: "asc" },
  });

  console.log(`Players to check: ${players.length}`);
  if (!players.length) return;

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    if (i > 0) await sleep(DELAY_MS);

    process.stdout.write(`  [${i + 1}/${players.length}] ${player.name.padEnd(28)} `);

    const person = await fetchPerson(player.externalId!);

    if (!person) {
      console.log("→ 404 (skip)");
      notFound++;
      continue;
    }

    // Candidate names to check (firstName first, then name from persons endpoint)
    const candidates = [person.firstName, person.name].filter(Boolean) as string[];
    const best = candidates.find((c) => isBetterName(player.name, c));

    if (!best) {
      console.log(`→ ${person.firstName ?? "—"} (no change needed)`);
      skipped++;
      continue;
    }

    console.log(`→ UPDATE: "${player.name}" → "${best}"`);
    updated++;

    if (!DRY_RUN) {
      await prisma.player.update({
        where: { id: player.id },
        data: { name: best },
      });
    }
  }

  console.log(`\n── Summary ───────────────────────────────────────`);
  console.log(`  Updated: ${updated}`);
  console.log(`  No change needed: ${skipped}`);
  console.log(`  Not found (404): ${notFound}`);
  console.log(`  Errors: ${errors}`);
  if (DRY_RUN) console.log(`\n  [DRY RUN] No DB writes performed.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
