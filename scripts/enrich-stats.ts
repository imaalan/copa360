/**
 * Bulk stats enrichment via Understat (free, no key).
 * Covers La Liga, Premier League, Bundesliga, Ligue 1, Serie A.
 *
 * Usage:
 *   npx tsx scripts/enrich-stats.ts              # all players without stats
 *   npx tsx scripts/enrich-stats.ts --dry-run    # preview only, no DB writes
 *   npx tsx scripts/enrich-stats.ts --force      # overwrite even if stats exist
 *   npx tsx scripts/enrich-stats.ts --season=2023  # different season (default: 2024)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEAGUES = [
  { key: "La_liga", label: "La Liga" },
  { key: "EPL", label: "Premier League" },
  { key: "Bundesliga", label: "Bundesliga" },
  { key: "Ligue_1", label: "Ligue 1" },
  { key: "Serie_A", label: "Serie A" },
];

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const SEASON = (() => {
  const a = argv.find((x) => x.startsWith("--season="));
  return a ? a.split("=")[1] : "2024";
})();
const TLAS = (() => {
  const a = argv.find((x) => x.startsWith("--tlas="));
  return a ? a.split("=")[1].toUpperCase().split(",").map(s => s.trim()) : null;
})();

// ── String helpers ────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ");
}

function namesMatch(dbName: string, understatName: string): boolean {
  const a = norm(dbName);
  const b = norm(understatName);
  if (a === b) return true;

  const aWords = a.split(" ");
  const bWords = b.split(" ");
  const aSet = new Set(aWords);
  const bSet = new Set(bWords);

  const [shorter, longerArr, longerSet] =
    aWords.length <= bWords.length
      ? [aWords, bWords, bSet]
      : [bWords, aWords, aSet];

  // Multi-word shorter: all its words found in longer (handles "Kylian Mbappe" ⊆ "Kylian Mbappe-Lottin")
  if (shorter.length >= 2 && shorter.every((w) => longerSet.has(w))) {
    return true;
  }

  // Single-word mononym: match only if the word is the LAST word of the longer name (surname position)
  // "Martinelli" ← "Gabriel Martinelli" ✓  |  "Gabriel" ← "Gabriel Magalhães" ✗
  if (shorter.length === 1) {
    const mono = shorter[0];
    if (mono.length > 4 && longerArr[longerArr.length - 1] === mono) return true;
  }

  return false;
}

// ── Understat fetch ───────────────────────────────────────────────────────────

type UnderstatPlayer = {
  id: string;
  player_name: string;
  games: string;
  goals: string;
  assists: string;
  xG: string;
  yellow_cards: string;
  red_cards: string;
  team_title: string;
};

async function fetchLeagueStats(leagueKey: string): Promise<UnderstatPlayer[]> {
  const res = await fetch("https://understat.com/main/getPlayersStats/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
    body: `league=${leagueKey}&season=${SEASON}`,
  });
  if (!res.ok) throw new Error(`Understat ${leagueKey} → ${res.status}`);
  const data = (await res.json()) as { success: boolean; players: UnderstatPlayer[] };
  if (!data.success) throw new Error(`Understat ${leagueKey} returned success=false`);
  return data.players;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[enrich-stats] season=${SEASON} dry=${DRY_RUN} force=${FORCE}\n`);

  // 1. Load all Copa360 players
  const teamFilter = TLAS ? { team: { tla: { in: TLAS } } } : {};
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nationality: true,
      position: true,
      currentClub: true,
      statsGoals: true,
      statsUpdatedAt: true,
      team: { select: { name: true, tla: true } },
    },
    where: FORCE ? { ...teamFilter } : { statsGoals: null, ...teamFilter },
  });

  console.log(`Players to enrich: ${players.length}`);
  if (!players.length) {
    console.log("Nothing to do.");
    return;
  }

  // 2. Fetch all league stats (one request per league)
  const allUnderstat: UnderstatPlayer[] = [];
  for (const league of LEAGUES) {
    process.stdout.write(`  Fetching ${league.label}... `);
    try {
      const data = await fetchLeagueStats(league.key);
      allUnderstat.push(...data);
      console.log(`${data.length} players`);
    } catch (err) {
      console.log(`ERROR: ${err}`);
    }
    // Small courtesy delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nTotal Understat entries: ${allUnderstat.length}`);

  // Deduplicate by id (player can appear in multiple leagues)
  const understatMap = new Map<string, UnderstatPlayer>();
  for (const p of allUnderstat) {
    const existing = understatMap.get(p.id);
    // Keep the one with more games (most complete season)
    if (!existing || Number(p.games) > Number(existing.games)) {
      understatMap.set(p.id, p);
    }
  }
  const understatPlayers = Array.from(understatMap.values());

  // 3. Match and update
  let matched = 0;
  let skipped = 0;
  let notFound = 0;

  for (const player of players) {
    // Match by name; if multiple candidates, use currentClub or team to disambiguate
    const candidates = understatPlayers.filter(u => namesMatch(player.name, u.player_name));
    const club = (player.currentClub ?? player.team?.name ?? "").toLowerCase();
    const us = candidates.length > 1
      ? (candidates.find(u => club && u.team_title.toLowerCase().includes(club.slice(0, 6))) ?? candidates[0])
      : candidates[0];

    if (!us) {
      notFound++;
      if (process.env.VERBOSE) {
        console.log(`  NOT FOUND: ${player.name}`);
      }
      continue;
    }

    const statsGoals = Number(us.goals);
    const statsAssists = Number(us.assists);
    const statsGames = Number(us.games);
    const statsYellowCards = Number(us.yellow_cards);
    const statsRedCards = Number(us.red_cards);
    const statsXg = parseFloat(Number(us.xG).toFixed(2));

    console.log(
      `  ✓ ${player.name.padEnd(30)} ← ${us.player_name.padEnd(30)} | G:${statsGoals} A:${statsAssists} (${us.team_title})`
    );

    matched++;

    if (!DRY_RUN) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          statsGoals,
          statsAssists,
          statsGames,
          statsYellowCards,
          statsRedCards,
          statsXg,
          statsSource: "understat",
          statsUpdatedAt: new Date(),
        },
      });
    }
  }

  console.log(`\n── Summary ──────────────────────────────────────`);
  console.log(`  Matched & updated: ${matched}`);
  console.log(`  Skipped (already had stats): ${skipped}`);
  console.log(`  Not found in Understat: ${notFound}`);
  console.log(`  Total input: ${players.length}`);
  if (DRY_RUN) console.log(`\n  [DRY RUN] No DB writes performed.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
