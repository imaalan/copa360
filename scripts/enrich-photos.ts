/**
 * enrich-photos.ts (v2) — Pipeline de fotos com matching determinístico.
 *
 * FASES (nessa ordem):
 *   0. Overrides   — data/photo-overrides.json sempre vence (correções manuais,
 *                    versionadas em git, sobrevivem a qualquer reseed).
 *   A. API-Football — 1 request por SELEÇÃO (/players/squads?team=) traz o elenco
 *                    inteiro com foto por ID estável. Match dentro do elenco
 *                    (camisa → nome → idade/posição). ~48 req p/ todas as seleções,
 *                    cabe no free tier (100/dia). Respostas cacheadas em
 *                    data/af-squads/{TLA}.json → reruns custam 0 requests.
 *   B. TheSportsDB — só para quem sobrou sem foto. Por ID (sdbPlayerId) quando
 *                    já conhecido; busca por nome APENAS com validação estrita
 *                    (nacionalidade canônica obrigatória + DOB obrigatória quando
 *                    comparável). Nada de "resultado único ⇒ aceita".
 *   C. Download    — (--download) baixa as fotos para public/players/ e aponta o
 *                    banco para o arquivo local: zero dependência externa durante
 *                    a Copa.
 *
 * Jogadores com photoVerified=true NUNCA são tocados (nem com --force).
 * Ambíguos/não encontrados vão para reports/photo-review-*.json → vire override.
 *
 * Uso:
 *   npx tsx scripts/enrich-photos.ts                    # pipeline completo (A+B)
 *   npx tsx scripts/enrich-photos.ts --tlas=BRA,FRA     # só algumas seleções
 *   npx tsx scripts/enrich-photos.ts --dry-run          # sem escrita
 *   npx tsx scripts/enrich-photos.ts --force            # refaz fotos não-verificadas
 *   npx tsx scripts/enrich-photos.ts --skip-af          # pula API-Football
 *   npx tsx scripts/enrich-photos.ts --skip-sdb         # pula TheSportsDB
 *   npx tsx scripts/enrich-photos.ts --download         # fase C (fotos locais)
 *   npx tsx scripts/enrich-photos.ts --af-budget=40     # teto de requests AF (default 90)
 *   npx tsx scripts/enrich-photos.ts --limit=50 --from=500
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  matchAfSquadPlayer,
  pickSdbCandidate,
  siglaToGroup,
  afPhotoUrl,
  strictNationalityMatch,
  type AfSquadPlayer,
  type SdbCandidate,
} from "../src/lib/photo-matching";
import { calcAge } from "../src/lib/utils";

const prisma = new PrismaClient();

const SDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const AF_KEY = process.env.API_FOOTBALL_KEY ?? "";
const AF_BASE = process.env.API_FOOTBALL_URL ?? "https://v3.football.api-sports.io";

const SDB_DELAY_MS = 700; // ~85 req/min, abaixo do limite free (100/min)
const SDB_RETRY_MS = 5000;

const ROOT = path.resolve(__dirname, "..");
const OVERRIDES_FILE = path.join(ROOT, "data", "photo-overrides.json");
const TEAM_MAP_FILE = path.join(ROOT, "data", "af-team-map.json");
const SQUAD_CACHE_DIR = path.join(ROOT, "data", "af-squads");
const REPORTS_DIR = path.join(ROOT, "reports");
const PUBLIC_PLAYERS_DIR = path.join(ROOT, "public", "players");

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const SKIP_AF = argv.includes("--skip-af");
const SKIP_SDB = argv.includes("--skip-sdb");
const DOWNLOAD = argv.includes("--download");
const numArg = (name: string, def: number) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? parseInt(a.split("=")[1], 10) : def;
};
const LIMIT = numArg("limit", Infinity);
const FROM_ID = numArg("from", 0);
const AF_BUDGET = numArg("af-budget", 90);
const TLAS = (() => {
  const a = argv.find((x) => x.startsWith("--tlas="));
  return a ? a.split("=")[1].toUpperCase().split(",").map((s) => s.trim()) : null;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  if (DRY_RUN) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

type Review = {
  generatedAt: string;
  dryRun: boolean;
  afUnmatched: Array<{ playerId: number; name: string; tla: string | null }>;
  sdbRejected: Array<{
    playerId: number;
    name: string;
    tla: string | null;
    reason: string;
    candidates: Array<{ name: string; nationality: string | null; dateBorn: string | null }>;
  }>;
  downloadFailed: Array<{ playerId: number; name: string; url: string }>;
};

const review: Review = {
  generatedAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  afUnmatched: [],
  sdbRejected: [],
  downloadFailed: [],
};

type DbPlayer = {
  id: number;
  externalId: number | null;
  name: string;
  nationality: string | null;
  position: string | null;
  dateOfBirth: Date | null;
  shirtNumber: number | null;
  photo: string | null;
  photoVerified: boolean;
  sdbPlayerId: string | null;
  apiFootballId: number | null;
  currentClub: string | null;
  currentClubLogo: string | null;
  team: { name: string; tla: string | null; country: string | null } | null;
};

const PLAYER_SELECT = {
  id: true, externalId: true, name: true, nationality: true, position: true,
  dateOfBirth: true, shirtNumber: true, photo: true, photoVerified: true,
  sdbPlayerId: true, apiFootballId: true, currentClub: true, currentClubLogo: true,
  team: { select: { name: true, tla: true, country: true } },
} as const;

async function updatePlayer(id: number, data: Record<string, unknown>) {
  if (DRY_RUN || !Object.keys(data).length) return;
  await prisma.player.update({ where: { id }, data });
}

// ── FASE 0 — Overrides manuais ────────────────────────────────────────────────

type OverridesFile = {
  players?: Record<
    string,
    { photo: string; verified?: boolean; note?: string; name?: string; tla?: string }
  >;
};

async function applyOverrides(): Promise<number> {
  const overrides = readJson<OverridesFile>(OVERRIDES_FILE, {});
  const entries = Object.entries(overrides.players ?? {});
  if (!entries.length) return 0;

  let applied = 0;
  for (const [externalIdStr, o] of entries) {
    const externalId = Number(externalIdStr);
    if (!Number.isFinite(externalId)) continue;

    const player = await prisma.player.findUnique({
      where: { externalId },
      select: { id: true, name: true, photo: true, photoVerified: true },
    });
    if (!player) {
      console.log(`   ⚠ override ignorado: externalId ${externalId} não está no banco`);
      continue;
    }
    const verified = o.verified !== false; // default true
    if (player.photo === o.photo && player.photoVerified === verified) continue;

    console.log(`   🔒 ${player.name} ← override${o.note ? ` (${o.note})` : ""}`);
    await updatePlayer(player.id, {
      photo: o.photo,
      photoSource: "override",
      photoVerified: verified,
      photoUpdatedAt: new Date(),
    });
    applied++;
  }
  return applied;
}

// ── FASE A — API-Football por elenco ──────────────────────────────────────────

let afRequests = 0;

async function afFetch(p: string): Promise<{ response: unknown[] } | null> {
  if (afRequests >= AF_BUDGET) return null;
  afRequests++;
  try {
    const res = await fetch(`${AF_BASE}${p}`, { headers: { "x-apisports-key": AF_KEY } });
    if (!res.ok) return null;
    return (await res.json()) as { response: unknown[] };
  } catch {
    return null;
  }
}

type AfTeamMap = Record<string, { id: number; name: string }>;
type AfTeamSearch = { team: { id: number; name: string; national: boolean; country?: string } };

async function resolveAfTeamId(
  tla: string,
  teamName: string,
  country: string | null,
  map: AfTeamMap
): Promise<number | null> {
  if (map[tla]) return map[tla].id;

  const queries = [...new Set([country, teamName].filter(Boolean))] as string[];
  for (const q of queries) {
    const data = await afFetch(`/teams?search=${encodeURIComponent(q.slice(0, 30))}`);
    const results = (data?.response as AfTeamSearch[] | undefined) ?? [];
    const nationals = results.filter((r) => r.team.national);
    const hit =
      nationals.find(
        (r) =>
          strictNationalityMatch(q, r.team.name) ||
          strictNationalityMatch(q, r.team.country ?? null) ||
          strictNationalityMatch(country, r.team.name)
      ) ?? (nationals.length === 1 ? nationals[0] : undefined);

    if (hit) {
      map[tla] = { id: hit.team.id, name: hit.team.name };
      return hit.team.id;
    }
  }
  return null;
}

type AfSquadResponse = Array<{ players?: AfSquadPlayer[] }>;

async function getAfSquad(tla: string, afTeamId: number): Promise<AfSquadPlayer[] | null> {
  const cacheFile = path.join(SQUAD_CACHE_DIR, `${tla}.json`);
  const cached = readJson<AfSquadPlayer[] | null>(cacheFile, null);
  if (cached?.length) return cached;

  const data = await afFetch(`/players/squads?team=${afTeamId}`);
  const squad = ((data?.response as AfSquadResponse | undefined)?.[0]?.players ?? []) as AfSquadPlayer[];
  if (squad.length) writeJson(cacheFile, squad);
  return squad.length ? squad : null;
}

async function phaseApiFootball(): Promise<{ photos: number; ids: number }> {
  if (!AF_KEY) {
    console.log("   (API_FOOTBALL_KEY ausente — fase pulada; usando só TheSportsDB)");
    return { photos: 0, ids: 0 };
  }

  const teamMap = readJson<AfTeamMap>(TEAM_MAP_FILE, {});
  const teams = await prisma.team.findMany({
    where: TLAS ? { tla: { in: TLAS } } : { tla: { not: null } },
    select: { id: true, name: true, tla: true, country: true },
    orderBy: { tla: "asc" },
  });

  let photos = 0;
  let ids = 0;

  for (const team of teams) {
    if (!team.tla) continue;
    if (afRequests >= AF_BUDGET) {
      console.log(`   ⛔ orçamento AF (${AF_BUDGET} req) atingido — ${team.tla} em diante fica p/ TheSportsDB`);
      break;
    }

    const afTeamId = await resolveAfTeamId(team.tla, team.name, team.country, teamMap);
    if (!afTeamId) {
      console.log(`   ✗ ${team.tla}: seleção não resolvida na API-Football`);
      continue;
    }

    const squad = await getAfSquad(team.tla, afTeamId);
    if (!squad) {
      console.log(`   ✗ ${team.tla}: elenco vazio/indisponível na API-Football`);
      continue;
    }

    const players = (await prisma.player.findMany({
      where: {
        teamId: team.id,
        photoVerified: false,
        ...(FORCE ? {} : { OR: [{ photo: null }, { apiFootballId: null }] }),
      },
      select: PLAYER_SELECT,
    })) as DbPlayer[];

    let teamPhotos = 0;
    for (const p of players) {
      const m = matchAfSquadPlayer(
        {
          name: p.name,
          shirtNumber: p.shirtNumber,
          age: calcAge(p.dateOfBirth),
          posGroup: siglaToGroup(p.position),
        },
        squad
      );

      if (!m) {
        if (!p.photo) review.afUnmatched.push({ playerId: p.id, name: p.name, tla: team.tla });
        continue;
      }

      const data: Record<string, unknown> = {};
      if (!p.apiFootballId) {
        data.apiFootballId = m.id;
        ids++;
      }
      if (!p.photo || FORCE) {
        data.photo = m.photo ?? afPhotoUrl(m.id);
        data.photoSource = "api-football";
        data.photoUpdatedAt = new Date();
        teamPhotos++;
        photos++;
      }
      await updatePlayer(p.id, data);
    }
    console.log(`   ✅ ${team.tla}: ${teamPhotos} foto(s) via API-Football (req usados: ${afRequests}/${AF_BUDGET})`);
  }

  writeJson(TEAM_MAP_FILE, teamMap);
  return { photos, ids };
}

// ── FASE B — TheSportsDB estrita ──────────────────────────────────────────────

async function sdbLookupById(id: string): Promise<SdbCandidate | null> {
  try {
    const res = await fetch(`${SDB_BASE}/lookupplayer.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { players?: SdbCandidate[] };
    return data.players?.[0] ?? null;
  } catch {
    return null;
  }
}

async function sdbSearch(name: string): Promise<SdbCandidate[]> {
  const url = `${SDB_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = (await res.json()) as { player?: SdbCandidate[] };
      const players = data.player ?? [];
      if (players.length) return players;
      if (attempt === 0) await sleep(SDB_RETRY_MS); // vazio = possível rate limit
    } catch {
      break;
    }
  }
  return [];
}

function extractSdbPhoto(c: SdbCandidate): string | null {
  const url = c.strCutout ?? c.strThumb ?? null;
  return url && !url.includes("placeholder") ? url : null;
}

async function phaseSportsDB(): Promise<{ photos: number }> {
  const players = (await prisma.player.findMany({
    where: {
      photoVerified: false,
      id: { gt: FROM_ID },
      ...(FORCE ? {} : { photo: null }),
      ...(TLAS ? { team: { tla: { in: TLAS } } } : {}),
    },
    orderBy: { id: "asc" },
    select: PLAYER_SELECT,
  })) as DbPlayer[];

  const limit = Math.min(players.length, LIMIT);
  console.log(`   Jogadores para a fase SDB: ${limit}${limit !== players.length ? ` (de ${players.length})` : ""}`);

  let photos = 0;
  for (let i = 0; i < limit; i++) {
    const p = players[i];
    process.stdout.write(`\r   [${i + 1}/${limit}] ${p.name.padEnd(28).slice(0, 28)}`);

    let chosen: SdbCandidate | null = null;
    let viaId = false;

    if (p.sdbPlayerId) {
      chosen = await sdbLookupById(p.sdbPlayerId);
      viaId = chosen != null;
    }

    if (!chosen) {
      const candidates = await sdbSearch(p.name);
      const pick = pickSdbCandidate(
        {
          name: p.name,
          nationality: p.nationality ?? p.team?.country ?? null,
          dateOfBirth: p.dateOfBirth,
          posGroup: siglaToGroup(p.position),
        },
        candidates
      );

      if (pick.ok) {
        chosen = pick.candidate;
      } else if (pick.reason !== "no-results") {
        review.sdbRejected.push({
          playerId: p.id,
          name: p.name,
          tla: p.team?.tla ?? null,
          reason: pick.reason,
          candidates: candidates.slice(0, 5).map((c) => ({
            name: c.strPlayer,
            nationality: c.strNationality ?? null,
            dateBorn: c.dateBorn ?? null,
          })),
        });
      }
    }

    if (chosen) {
      const data: Record<string, unknown> = {};
      const photo = extractSdbPhoto(chosen);
      if (photo && (!p.photo || FORCE)) {
        data.photo = photo;
        data.photoSource = "thesportsdb";
        data.photoUpdatedAt = new Date();
        photos++;
      }
      if (!viaId && chosen.idPlayer && !p.sdbPlayerId) data.sdbPlayerId = String(chosen.idPlayer);
      if (!p.currentClub && chosen.strTeam) data.currentClub = chosen.strTeam;
      if (!p.currentClubLogo && chosen.strTeamLogo) data.currentClubLogo = chosen.strTeamLogo;
      await updatePlayer(p.id, data);
    }

    await sleep(SDB_DELAY_MS);
  }
  if (limit) process.stdout.write("\n");
  return { photos };
}

// ── FASE C — Download local (--download) ──────────────────────────────────────

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function phaseDownload(): Promise<{ saved: number }> {
  const players = (await prisma.player.findMany({
    where: {
      photo: { startsWith: "http" },
      externalId: { not: null },
      ...(TLAS ? { team: { tla: { in: TLAS } } } : {}),
    },
    select: PLAYER_SELECT,
    orderBy: { id: "asc" },
  })) as DbPlayer[];

  console.log(`   Fotos remotas para baixar: ${players.length}`);
  fs.mkdirSync(PUBLIC_PLAYERS_DIR, { recursive: true });

  let saved = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    process.stdout.write(`\r   [${i + 1}/${players.length}] ${p.name.padEnd(28).slice(0, 28)}`);
    try {
      const res = await fetch(p.photo!);
      const type = res.headers.get("content-type")?.split(";")[0] ?? "";
      const ext = EXT_BY_TYPE[type];
      if (!res.ok || !ext) throw new Error(`HTTP ${res.status} / ${type}`);

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error("arquivo suspeito (<1KB)");

      const filename = `${p.externalId}.${ext}`;
      if (!DRY_RUN) {
        fs.writeFileSync(path.join(PUBLIC_PLAYERS_DIR, filename), buf);
        await updatePlayer(p.id, {
          photo: `/players/${filename}`,
          photoSource: "local",
          photoUpdatedAt: new Date(),
        });
      }
      saved++;
    } catch {
      review.downloadFailed.push({ playerId: p.id, name: p.name, url: p.photo! });
    }
    await sleep(250);
  }
  if (players.length) process.stdout.write("\n");
  return { saved };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nCopa360 · Photo Enrichment v2`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`dry-run=${DRY_RUN} force=${FORCE} download=${DOWNLOAD} tlas=${TLAS?.join(",") ?? "todas"} af-budget=${AF_BUDGET}\n`);

  console.log(`FASE 0 · Overrides manuais (${path.relative(ROOT, OVERRIDES_FILE)})`);
  const overridesApplied = await applyOverrides();
  console.log(`   ${overridesApplied} override(s) aplicado(s)\n`);

  let afPhotos = 0, afIds = 0;
  if (!SKIP_AF) {
    console.log(`FASE A · API-Football (elencos por seleção)`);
    const r = await phaseApiFootball();
    afPhotos = r.photos; afIds = r.ids;
    console.log(`   Subtotal: ${afPhotos} fotos · ${afIds} apiFootballId novos · ${afRequests} requests\n`);
  }

  let sdbPhotos = 0;
  if (!SKIP_SDB) {
    console.log(`FASE B · TheSportsDB (matching estrito)`);
    const r = await phaseSportsDB();
    sdbPhotos = r.photos;
    console.log(`   Subtotal: ${sdbPhotos} fotos\n`);
  }

  let downloaded = 0;
  if (DOWNLOAD) {
    console.log(`FASE C · Download para public/players/`);
    const r = await phaseDownload();
    downloaded = r.saved;
    console.log(`   Subtotal: ${downloaded} arquivos\n`);
  }

  const reportFile = path.join(
    REPORTS_DIR,
    `photo-review-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}${DRY_RUN ? "-dry" : ""}.json`
  );
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(review, null, 2) + "\n", "utf8");

  const pending = review.afUnmatched.length + review.sdbRejected.length;
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Resumo: ${overridesApplied} overrides · ${afPhotos} fotos AF · ${sdbPhotos} fotos SDB · ${downloaded} locais`);
  console.log(`Para revisão manual: ${pending} caso(s) → ${path.relative(ROOT, reportFile)}`);
  console.log(`Dica: corrija com  npx tsx scripts/set-photo.ts --name="Fulano" --tla=XXX --url="..." --verify`);
  if (DRY_RUN) console.log(`\n(dry-run — nenhuma escrita no banco)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
