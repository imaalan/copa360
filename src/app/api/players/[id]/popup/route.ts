import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FD_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const AF_KEY = process.env.API_FOOTBALL_KEY ?? "";
const AF_BASE = process.env.API_FOOTBALL_URL ?? "https://v3.football.api-sports.io";

// ── Helpers ──────────────────────────────────────────────────────────────────

function normStr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function normNat(s: string): string {
  return normStr(s).replace(/ian$|ese$|ish$|an$/, "");
}

function nationalityMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normNat(a), nb = normNat(b);
  return na === nb || na.startsWith(nb.slice(0, 4)) || nb.startsWith(na.slice(0, 4));
}

function nameMatch(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const na = normStr(a), nb = normStr(b);
  if (na === nb || nb.includes(na) || na.includes(nb)) return true;
  // Handle abbreviated first name: "J. Bellingham" vs "Jude Bellingham"
  const aLast = na.split(" ").slice(-1)[0];
  const bLast = nb.split(" ").slice(-1)[0];
  return aLast.length > 3 && aLast === bLast;
}

// ── TheSportsDB ───────────────────────────────────────────────────────────────

type SDBPlayer = {
  strPlayer: string;
  strNationality: string;
  strThumb?: string;
  strCutout?: string;
  strTeam?: string;
  strTeamLogo?: string;
  strDescriptionEN?: string;
};

async function fetchFromSportsDB(
  name: string,
  nationality: string | null
): Promise<{ photo: string | null; club: string | null; clubLogo: string | null } | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const players: SDBPlayer[] = data.player ?? [];
    if (!players.length) return null;

    const match = players.find(
      (p) => nameMatch(name, p.strPlayer) && nationalityMatch(nationality, p.strNationality)
    );
    if (!match) return null;

    const thumb = match.strThumb ?? match.strCutout ?? null;
    const photo = thumb && !thumb.includes("placeholder") ? thumb : null;
    const club = match.strTeam ?? null;
    const clubLogo = match.strTeamLogo ?? null;

    return { photo, club, clubLogo };
  } catch {
    return null;
  }
}

// ── API-Football ──────────────────────────────────────────────────────────────

type AFStats = {
  goals: { total: number | null; assists: number | null };
  games: { appearences: number | null; lineups: number | null; minutes: number | null; rating: string | null };
  cards: { yellow: number | null; red: number | null };
  passes: { total: number | null; key: number | null; accuracy: number | null };
  dribbles: { attempts: number | null; success: number | null };
};

async function afFetch(path: string) {
  const res = await fetch(`${AF_BASE}${path}`, {
    headers: { "x-apisports-key": AF_KEY },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ response: unknown[] }>;
}

async function findAFPlayerId(name: string, clubName: string): Promise<number | null> {
  // Step 1: find team ID in API-Football
  const teamData = await afFetch(`/teams?search=${encodeURIComponent(clubName.slice(0, 20))}`);
  const teams = teamData?.response as Array<{ team: { id: number; name: string } }> | undefined;
  if (!teams?.length) return null;

  const teamId = teams[0].team.id;

  // Step 2: search player by name + team (1 request per season instead of paging)
  const searchName = normStr(name).split(" ").slice(-1)[0]; // last name
  for (const season of [2024, 2023, 2022]) {
    const playersData = await afFetch(`/players?search=${encodeURIComponent(searchName)}&team=${teamId}&season=${season}`);
    const players = playersData?.response as Array<{ player: { id: number; name: string } }> | undefined;
    if (!players?.length) continue;

    const found = players.find((p) => nameMatch(name, p.player.name));
    if (found) return found.player.id;
  }
  return null;
}

async function fetchAFStats(playerId: number): Promise<AFStats | null> {
  const data = await afFetch(`/players?id=${playerId}&season=2024`);
  const player = (data?.response as Array<{ statistics: AFStats[] }>)?.[0];
  const stats = player?.statistics?.[0];
  if (!stats) return null;
  return stats;
}

type Trophy = { league: string; country: string; season: string; place: string };

async function fetchAFTrophies(playerId: number): Promise<Trophy[]> {
  const data = await afFetch(`/trophies?player=${playerId}`);
  const trophies = (data?.response as Trophy[]) ?? [];
  return trophies.filter((t) => t.place === "Winner").slice(0, 10);
}

// ── football-data.org current club ────────────────────────────────────────────

async function fetchFDClub(
  externalId: number,
  nationalTeamName: string | null
): Promise<{ name: string; crest: string | null } | null> {
  try {
    const res = await fetch(`https://api.football-data.org/v4/persons/${externalId}`, {
      headers: { "X-Auth-Token": FD_KEY },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { currentTeam?: { name: string; crest?: string } };
    const ct = data.currentTeam;
    if (!ct) return null;
    if (nationalTeamName && normStr(ct.name).includes(normStr(nationalTeamName).slice(0, 5))) return null;
    return { name: ct.name, crest: ct.crest ?? null };
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = Number(id);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      team: {
        select: {
          id: true, tla: true, name: true, logo: true,
          homeMatches: {
            where: { status: { not: "FINISHED" } },
            orderBy: { utcDate: "asc" },
            take: 3,
            select: {
              id: true, utcDate: true, stage: true, group: true, status: true,
              awayTeam: { select: { tla: true, name: true, logo: true } },
            },
          },
          awayMatches: {
            where: { status: { not: "FINISHED" } },
            orderBy: { utcDate: "asc" },
            take: 3,
            select: {
              id: true, utcDate: true, stage: true, group: true, status: true,
              homeTeam: { select: { tla: true, name: true, logo: true } },
            },
          },
        },
      },
    },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Enrichment (cached fields) ───────────────────────────────────────────

  const updates: Record<string, unknown> = {};

  // 1. Photo + club from TheSportsDB
  let photo = player.photo;
  let currentClub = player.currentClub;
  let currentClubLogo = player.currentClubLogo;

  const sdb = (!photo || !currentClub)
    ? await fetchFromSportsDB(player.name, player.nationality)
    : null;

  if (sdb) {
    if (!photo && sdb.photo) { photo = sdb.photo; updates.photo = photo; }
    if (!currentClub && sdb.club) { currentClub = sdb.club; updates.currentClub = currentClub; }
    if (!currentClubLogo && sdb.clubLogo) { currentClubLogo = sdb.clubLogo; updates.currentClubLogo = currentClubLogo; }
  }

  // 2. Club from football-data.org if still missing
  if (!currentClub && player.externalId) {
    const fdClub = await fetchFDClub(player.externalId, player.team?.name ?? null);
    if (fdClub) {
      currentClub = fdClub.name;
      currentClubLogo = fdClub.crest;
      updates.currentClub = currentClub;
      updates.currentClubLogo = currentClubLogo;
    }
  }

  // 3. API-Football: player ID, stats, trophies
  let apiFootballId = player.apiFootballId;
  let trophies = player.trophies as Trophy[] | null;
  let afStats: AFStats | null = null;

  if (!apiFootballId && currentClub) {
    apiFootballId = await findAFPlayerId(player.name, currentClub);
    if (apiFootballId) updates.apiFootballId = apiFootballId;
  }

  if (apiFootballId) {
    afStats = await fetchAFStats(apiFootballId);

    // Fetch trophies only if not cached
    if (!trophies) {
      trophies = await fetchAFTrophies(apiFootballId);
      if (trophies.length) updates.trophies = trophies;
    }
  }

  // Persist enrichment cache
  if (Object.keys(updates).length) {
    await prisma.player.update({ where: { id: playerId }, data: updates });
  }

  // ── Matches ───────────────────────────────────────────────────────────────

  const matches = [
    ...(player.team?.homeMatches ?? []).map((m) => ({ ...m, opponent: m.awayTeam, isHome: true })),
    ...(player.team?.awayMatches ?? []).map((m) => ({ ...m, opponent: m.homeTeam, isHome: false })),
  ]
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 3);

  return NextResponse.json({
    id: player.id,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth,
    shirtNumber: player.shirtNumber,
    photo,
    team: player.team
      ? { id: player.team.id, tla: player.team.tla, name: player.team.name, logo: player.team.logo }
      : null,
    currentClub: currentClub ? { name: currentClub, logo: currentClubLogo } : null,
    stats: afStats,
    trophies: trophies ?? [],
    matches,
  });
}
