/**
 * enrich-coaches.ts — Photo + career stats enrichment for coaches.
 *
 * Photos: TheSportsDB free API (searchmanagers)
 * Stats:  API-Football /coachs (career record per team)
 * Trophies: API-Football /trophies?coach=
 *
 * Usage:
 *   npx tsx scripts/enrich-coaches.ts
 *   npx tsx scripts/enrich-coaches.ts --dry-run
 *   npx tsx scripts/enrich-coaches.ts --force     # re-enrich even if data exists
 */

import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const DRY   = args.includes("--dry-run");
const FORCE = args.includes("--force");

const AF_KEY  = process.env.API_FOOTBALL_KEY ?? "";
const AF_BASE = process.env.API_FOOTBALL_URL ?? "https://v3.football.api-sports.io";
const SDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normStr(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function nameMatch(a: string, b: string): boolean {
  const na = normStr(a), nb = normStr(b);
  if (na === nb) return true;
  const aLast = na.split(" ").at(-1)!;
  const bLast = nb.split(" ").at(-1)!;
  return aLast.length > 3 && aLast === bLast;
}

// ── TheSportsDB ───────────────────────────────────────────────────────────────

async function fetchSDBPhoto(name: string, nationality: string | null): Promise<string | null> {
  try {
    // Try manager endpoint first
    const res = await fetch(`${SDB_BASE}/searchmanagers.php?m=${encodeURIComponent(name)}`);
    if (res.ok) {
      const data = await res.json() as { managers?: Array<{ strManager: string; strNationality?: string; strCutout?: string; strThumb?: string }> };
      const managers = data.managers ?? [];
      const match = managers.find(m => nameMatch(name, m.strManager)) ??
        (managers.length === 1 ? managers[0] : null);
      if (match) {
        const photo = match.strCutout ?? match.strThumb ?? null;
        if (photo && !photo.includes("placeholder")) return photo;
      }
    }
  } catch { /* ignore */ }

  try {
    // Fallback: search as player (some coaches have player entries)
    const res2 = await fetch(`${SDB_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
    if (res2.ok) {
      const data2 = await res2.json() as { player?: Array<{ strPlayer: string; strNationality?: string; strThumb?: string; strCutout?: string }> };
      const players = data2.player ?? [];
      const match2 = players.find(p =>
        nameMatch(name, p.strPlayer) &&
        (!nationality || normStr(p.strNationality ?? "").includes(normStr(nationality).slice(0, 4)))
      );
      if (match2) {
        const photo = match2.strCutout ?? match2.strThumb ?? null;
        if (photo && !photo.includes("placeholder")) return photo;
      }
    }
  } catch { /* ignore */ }

  return null;
}

// ── API-Football ──────────────────────────────────────────────────────────────

type AFCoachCareer = {
  team: { id: number; name: string };
  start: string | null;
  end: string | null;
  games: { played: number | null; wins: number | null; draws: number | null; loses: number | null };
};

type AFCoach = {
  id: number;
  name: string;
  photo: string;
  career: AFCoachCareer[];
};

type AFTrophy = { league: string; country: string; season: string; place: string };

async function fetchAFCoach(name: string): Promise<AFCoach | null> {
  if (!AF_KEY) return null;
  try {
    const lastName = name.split(" ").at(-1)!;
    const res = await fetch(`${AF_BASE}/coachs?search=${encodeURIComponent(lastName)}`, {
      headers: { "x-apisports-key": AF_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json() as { response: AFCoach[] };
    const coaches = data.response ?? [];
    return coaches.find(c => nameMatch(name, c.name)) ?? null;
  } catch {
    return null;
  }
}

async function fetchAFTrophies(coachId: number): Promise<AFTrophy[]> {
  if (!AF_KEY) return [];
  try {
    const res = await fetch(`${AF_BASE}/trophies?coach=${coachId}`, {
      headers: { "x-apisports-key": AF_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json() as { response: AFTrophy[] };
    return (data.response ?? []).filter(t => t.place === "Winner").slice(0, 15);
  } catch {
    return [];
  }
}

function aggregateCareer(career: AFCoachCareer[]) {
  let matches = 0, wins = 0, draws = 0, losses = 0;
  for (const c of career) {
    if (!c.games) continue;
    matches += c.games.played ?? 0;
    wins    += c.games.wins ?? 0;
    draws   += c.games.draws ?? 0;
    losses  += c.games.loses ?? 0;
  }
  return { matches, wins, draws, losses };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const coaches = await prisma.coach.findMany({
    where: FORCE ? undefined : {
      OR: [{ photo: null }, { statsMatches: null }],
    },
    include: { team: { select: { tla: true, name: true } } },
  });

  console.log(`Coaches to enrich: ${coaches.length}\n`);

  for (const coach of coaches) {
    const tla = coach.team?.tla ?? "?";
    process.stdout.write(`[${tla}] ${coach.name} ... `);

    const updates: Record<string, unknown> = {};

    // 1. Photo from TheSportsDB
    if (!coach.photo || FORCE) {
      const photo = await fetchSDBPhoto(coach.name, coach.nationality);
      if (photo) { updates.photo = photo; process.stdout.write("📷 "); }
      await sleep(600);
    }

    // 2. Stats + photo from API-Football
    if ((!coach.statsMatches || FORCE) && AF_KEY) {
      const afCoach = await fetchAFCoach(coach.name);
      if (afCoach) {
        const stats = aggregateCareer(afCoach.career);
        updates.apiFootballId = afCoach.id;
        if (stats.matches > 0) {
          updates.statsMatches = stats.matches;
          updates.statsWins    = stats.wins;
          updates.statsDraws   = stats.draws;
          updates.statsLosses  = stats.losses;
          updates.statsUpdatedAt = new Date();
          process.stdout.write(`📊 (${stats.wins}W/${stats.draws}D/${stats.losses}L) `);
        }

        // Photo from AF if SDB didn't find one
        if (!updates.photo && !coach.photo && afCoach.photo && !afCoach.photo.includes("null")) {
          updates.photo = afCoach.photo;
          process.stdout.write("📷AF ");
        }

        // Trophies
        if (!coach.trophies || FORCE) {
          const trophies = await fetchAFTrophies(afCoach.id);
          if (trophies.length) { updates.trophies = trophies; process.stdout.write(`🏆${trophies.length} `); }
          await sleep(300);
        }
      }
      await sleep(400);
    }

    console.log(Object.keys(updates).length ? "✓" : "—");

    if (!DRY && Object.keys(updates).length) {
      await prisma.coach.update({ where: { id: coach.id }, data: updates });
    }
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
