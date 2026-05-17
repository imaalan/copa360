import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FD_BASE = process.env.FOOTBALL_DATA_API_URL ?? "https://api.football-data.org/v4";
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

function normStr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim();
}

// "Brazilian" → "brazil", "Brazil" → "brazil", "French" → "french"
function normNat(s: string): string {
  return normStr(s).replace(/ian$|ese$|ish$|an$/, "");
}

function nationalityMatch(dbNat: string | null, sdbNat: string | null): boolean {
  if (!dbNat || !sdbNat) return false;
  const a = normNat(dbNat);
  const b = normNat(sdbNat);
  return a === b || a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4));
}

function nameMatch(dbName: string, sdbName: string | undefined): boolean {
  if (!sdbName) return false;
  const a = normStr(dbName);
  const b = normStr(sdbName);
  return a === b || b.includes(a) || a.includes(b);
}

async function fetchPhotoFromSportsDB(
  name: string,
  nationality: string | null
): Promise<string | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const players: Array<Record<string, string>> = data.player ?? [];
    if (players.length === 0) return null;

    // Require both name AND nationality to match — prevents wrong-player photos
    const match = players.find(
      (p) => nameMatch(name, p.strPlayer) && nationalityMatch(nationality, p.strNationality)
    );

    if (!match) return null;

    const thumb = match.strThumb ?? match.strCutout ?? null;
    return thumb && !thumb.includes("placeholder") ? thumb : null;
  } catch {
    return null;
  }
}

async function fetchCurrentClub(
  externalId: number,
  nationalTeamName: string | null
): Promise<{ name: string; crest: string | null; competitions: string[] } | null> {
  try {
    const res = await fetch(`${FD_BASE}/persons/${externalId}`, {
      headers: { "X-Auth-Token": FD_KEY },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const ct = data.currentTeam as Record<string, unknown> | null;
    if (!ct) return null;

    const name = String(ct.name ?? "");
    // Skip if API returned the national team instead of the club
    if (nationalTeamName && name.toLowerCase() === nationalTeamName.toLowerCase()) return null;

    const comps = (ct.runningCompetitions as Array<Record<string, unknown>> | null) ?? [];
    // Filter out international comps (Copa do Mundo etc.) to focus on club competitions
    const clubComps = comps
      .filter((c) => String(c.type ?? "") !== "CUP" || String(c.code ?? "").toLowerCase() !== "wc")
      .map((c) => String(c.name ?? ""))
      .filter(Boolean)
      .slice(0, 3);

    return { name, crest: ct.crest ? String(ct.crest) : null, competitions: clubComps };
  } catch {
    return null;
  }
}

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

  // Fetch photo from TheSportsDB if not cached — validate nationality to avoid wrong player
  let photo = player.photo;
  if (!photo) {
    photo = await fetchPhotoFromSportsDB(player.name, player.nationality);
    if (photo) {
      await prisma.player.update({ where: { id: playerId }, data: { photo } });
    }
  }

  // Fetch current club from football-data.org (skip if it returns national team)
  const currentClub = player.externalId
    ? await fetchCurrentClub(player.externalId, player.team?.name ?? null)
    : null;

  // Merge upcoming matches
  const matches = [
    ...(player.team?.homeMatches ?? []).map((m) => ({
      ...m, opponent: m.awayTeam, isHome: true,
    })),
    ...(player.team?.awayMatches ?? []).map((m) => ({
      ...m, opponent: m.homeTeam, isHome: false,
    })),
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
    team: player.team ? {
      id: player.team.id,
      tla: player.team.tla,
      name: player.team.name,
      logo: player.team.logo,
    } : null,
    currentClub,
    matches,
  });
}
