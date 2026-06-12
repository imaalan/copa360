import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normStr } from "@/lib/utils";
import {
  pickSdbCandidate,
  siglaToGroup,
  type SdbCandidate,
} from "@/lib/photo-matching";

const FD_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const AF_KEY = process.env.API_FOOTBALL_KEY ?? "";
const AF_BASE = process.env.API_FOOTBALL_URL ?? "https://v3.football.api-sports.io";

// ── TheSportsDB (matching ESTRITO via lib compartilhada) ─────────────────────
//
// Antes: cascata frouxa com fallback `byName.length === 1 → aceita`, que
// persistia fotos de homônimos no banco (caso Rayan BRA × Rayan Cherki FRA).
// Agora: pickSdbCandidate — nacionalidade canônica obrigatória + DOB
// obrigatória quando comparável. Ambíguo = não enriquece (fica p/ o script
// offline + overrides), em vez de chutar.

type SdbResult = {
  photo: string | null;
  club: string | null;
  clubLogo: string | null;
  sdbPlayerId: string | null;
};

async function fetchFromSportsDB(target: {
  name: string;
  nationality: string | null;
  dateOfBirth: Date | null;
  position: string | null;
}): Promise<SdbResult | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(target.name)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { player?: SdbCandidate[] };
    const candidates = data.player ?? [];

    const pick = pickSdbCandidate(
      {
        name: target.name,
        nationality: target.nationality,
        dateOfBirth: target.dateOfBirth,
        posGroup: siglaToGroup(target.position),
      },
      candidates
    );
    if (!pick.ok) return null;

    return {
      photo: pick.photo,
      club: pick.candidate.strTeam ?? null,
      clubLogo: pick.candidate.strTeamLogo ?? null,
      sdbPlayerId: pick.candidate.idPlayer ? String(pick.candidate.idPlayer) : null,
    };
  } catch {
    return null;
  }
}

// ── API-Football ──────────────────────────────────────────────────────────────
//
// IMPORTANTE: a rota NÃO faz mais busca por nome na API-Football em runtime.
// Aquela busca (a) queimava 2–4 requests da quota free (100/dia) por popup
// aberto e (b) casava por sobrenome — outra porta de entrada de homônimos.
// O apiFootballId agora nasce offline (enrich-photos FASE A, match por elenco)
// e a rota apenas CONSOME o id quando ele já existe no banco.

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

async function fetchAFStats(playerId: number): Promise<{ stats: AFStats | null; photo: string | null }> {
  const data = await afFetch(`/players?id=${playerId}&season=2024`);
  const entry = (data?.response as Array<{ player: { photo?: string }; statistics: AFStats[] }>)?.[0];
  return {
    stats: entry?.statistics?.[0] ?? null,
    photo: entry?.player?.photo ?? null,
  };
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
  if (!Number.isFinite(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      team: {
        select: { id: true, tla: true, name: true, logo: true },
      },
    },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Enrichment (cached fields) ───────────────────────────────────────────

  const updates: Record<string, unknown> = {};

  let photo = player.photo;
  let currentClub = player.currentClub;
  let currentClubLogo = player.currentClubLogo;

  // 1. Foto + clube via TheSportsDB — SOMENTE se a foto não está travada.
  //    photoVerified=true significa correção manual/override: runtime nunca toca.
  const needsSdb = (!photo && !player.photoVerified) || !currentClub;
  const sdb = needsSdb
    ? await fetchFromSportsDB({
        name: player.name,
        nationality: player.nationality,
        dateOfBirth: player.dateOfBirth,
        position: player.position,
      })
    : null;

  if (sdb) {
    if (!photo && !player.photoVerified && sdb.photo) {
      photo = sdb.photo;
      updates.photo = photo;
      updates.photoSource = "thesportsdb";
      updates.photoUpdatedAt = new Date();
    }
    if (!player.sdbPlayerId && sdb.sdbPlayerId) updates.sdbPlayerId = sdb.sdbPlayerId;
    if (!currentClub && sdb.club) { currentClub = sdb.club; updates.currentClub = currentClub; }
    if (!currentClubLogo && sdb.clubLogo) { currentClubLogo = sdb.clubLogo; updates.currentClubLogo = currentClubLogo; }
  }

  // 2. Clube via football-data.org se ainda faltar
  if (!currentClub && player.externalId) {
    const fdClub = await fetchFDClub(player.externalId, player.team?.name ?? null);
    if (fdClub) {
      currentClub = fdClub.name;
      currentClubLogo = fdClub.crest;
      updates.currentClub = currentClub;
      updates.currentClubLogo = currentClubLogo;
    }
  }

  // 3. API-Football: APENAS consome apiFootballId já resolvido offline.
  const apiFootballId = player.apiFootballId;
  let trophies = player.trophies as Trophy[] | null;

  if (apiFootballId && AF_KEY) {
    // Troféus só se ainda não cacheados (1 request, depois fica no banco).
    if (!trophies) {
      trophies = await fetchAFTrophies(apiFootballId);
      if (trophies.length) updates.trophies = trophies;
    }

    // Foto da CDN como último fallback (id estável ⇒ sem risco de homônimo).
    if (!photo && !player.photoVerified) {
      const afResult = await fetchAFStats(apiFootballId);
      if (afResult.photo) {
        photo = afResult.photo;
        updates.photo = photo;
        updates.photoSource = "api-football";
        updates.photoUpdatedAt = new Date();
      }
    }
  }

  // Stats a partir do cache Understat no banco
  const afStats: AFStats | null = (() => {
    if (player.statsGoals != null) {
      return {
        goals: { total: player.statsGoals, assists: player.statsAssists ?? null },
        games: { appearences: player.statsGames ?? null, lineups: null, minutes: null, rating: null },
        cards: { yellow: player.statsYellowCards ?? null, red: player.statsRedCards ?? null },
        passes: { total: null, key: null, accuracy: null },
        dribbles: { attempts: null, success: null },
      };
    }
    return null;
  })();

  // Persist enrichment cache
  if (Object.keys(updates).length) {
    await prisma.player.update({ where: { id: playerId }, data: updates });
  }

  return NextResponse.json({
    id: player.id,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth,
    shirtNumber: player.shirtNumber,
    photo,
    bio: player.bio ?? null,
    team: player.team
      ? { id: player.team.id, tla: player.team.tla, name: player.team.name, logo: player.team.logo }
      : null,
    currentClub: currentClub ? { name: currentClub, logo: currentClubLogo } : null,
    stats: afStats,
    trophies: trophies ?? [],
  });
}
