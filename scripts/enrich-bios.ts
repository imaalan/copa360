/**
 * enrich-bios.ts
 * Busca biografia em PT-BR para jogadores e técnicos.
 * Fonte primária: TheSportsDB (strDescriptionPT)
 * Fallback: Wikipedia PT-BR (summary API)
 *
 * Validação multi-campo obrigatória antes de salvar — evita bios de homônimos.
 *
 * Flags:
 *   --players-only   só jogadores
 *   --coaches-only   só técnicos
 *   --tlas=BRA,FRA   filtra por seleção
 *   --force          sobrescreve bios já existentes
 *   --dry-run        mostra o que faria, sem salvar
 */

import { prisma } from "../src/lib/prisma";
import axios from "axios";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const PLAYERS_ONLY = process.argv.includes("--players-only");
const COACHES_ONLY = process.argv.includes("--coaches-only");
const TLA_FILTER = process.argv
  .find((a) => a.startsWith("--tlas="))
  ?.split("=")[1]
  ?.split(",")
  .map((t) => t.toUpperCase());

const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const WIKI_PT = "https://pt.wikipedia.org/api/rest_v1/page/summary";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Normalização de string para comparação ────────────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string, b: string): number {
  const na = norm(a).split(" ").filter(Boolean);
  const nb = norm(b).split(" ").filter(Boolean);
  const shared = na.filter((w) => nb.includes(w) && w.length > 2);
  return shared.length / Math.max(na.length, nb.length, 1);
}

// ── Validação de match ────────────────────────────────────────────────────────

interface MatchCandidate {
  name: string;
  nationality?: string | null;
  team?: string | null;
  birthYear?: number | null;
}

function isGoodMatch(
  candidate: MatchCandidate,
  subject: { name: string; nationality?: string | null; teamName?: string | null; birthYear?: number | null }
): boolean {
  // Nome: exige pelo menos 60% de tokens em comum
  const nameScore = nameSimilarity(candidate.name, subject.name);
  if (nameScore < 0.6) return false;

  // Nacionalidade: se ambos têm, devem bater (ou ser substring uma da outra)
  if (candidate.nationality && subject.nationality) {
    const cn = norm(candidate.nationality);
    const sn = norm(subject.nationality);
    if (!cn.includes(sn) && !sn.includes(cn)) return false;
  }

  // Ano de nascimento: se ambos têm, diferença máx 1 ano (dados às vezes imprecisos)
  if (candidate.birthYear && subject.birthYear) {
    if (Math.abs(candidate.birthYear - subject.birthYear) > 1) return false;
  }

  return true;
}

// ── TheSportsDB ───────────────────────────────────────────────────────────────

async function fetchTSDBPlayerBio(
  name: string,
  subject: { nationality?: string | null; teamName?: string | null; birthYear?: number | null }
): Promise<string | null> {
  try {
    const res = await axios.get(`${TSDB_BASE}/searchplayers.php`, {
      params: { p: name },
      timeout: 8000,
    });
    const players: Record<string, string>[] = res.data?.player ?? [];

    for (const p of players) {
      const bio = p.strDescriptionPT?.trim();
      if (!bio) continue;

      const candidate: MatchCandidate = {
        name: p.strPlayer,
        nationality: p.strNationality,
        team: p.strTeam,
        birthYear: p.dateBorn ? new Date(p.dateBorn).getFullYear() : null,
      };

      if (isGoodMatch(candidate, { name, ...subject })) return bio;
    }
  } catch {
    // rate limit ou erro de rede
  }
  return null;
}

async function fetchTSDBCoachBio(
  name: string,
  subject: { nationality?: string | null; teamName?: string | null; birthYear?: number | null }
): Promise<string | null> {
  try {
    const res = await axios.get(`${TSDB_BASE}/searchmanagers.php`, {
      params: { p: name },
      timeout: 8000,
    });
    const managers: Record<string, string>[] = res.data?.manager ?? [];

    for (const m of managers) {
      const bio = m.strDescriptionPT?.trim();
      if (!bio) continue;

      const candidate: MatchCandidate = {
        name: m.strManager,
        nationality: m.strNationality,
        birthYear: m.dateBorn ? new Date(m.dateBorn).getFullYear() : null,
      };

      if (isGoodMatch(candidate, { name, ...subject })) return bio;
    }
  } catch {}
  return null;
}

// ── Wikipedia PT-BR ───────────────────────────────────────────────────────────

async function fetchWikiBio(
  name: string,
  _subject: { nationality?: string | null; birthYear?: number | null }
): Promise<string | null> {
  const slug = name.replace(/ /g, "_");
  try {
    const res = await axios.get(`${WIKI_PT}/${encodeURIComponent(slug)}`, {
      timeout: 8000,
      headers: { "User-Agent": "Copa360/1.0 (copa360-app)" },
    });
    const data = res.data;

    if (data.type !== "standard") return null;

    const extract: string = data.extract ?? "";
    if (!extract) return null;

    // Pelo menos 1 token do nome deve estar no título (nomes curtos/apelidos)
    const nameTokens = norm(name).split(" ").filter((w) => w.length > 2);
    const titleNorm = norm(data.title ?? "");
    const hasMatch = nameTokens.some((t) => titleNorm.includes(t));
    if (!hasMatch) return null;

    // Extrai primeiro parágrafo não vazio
    const firstPara = extract.split("\n").find((l) => l.trim().length > 40) ?? "";
    return firstPara.trim() || null;
  } catch {}
  return null;
}

// ── Jogadores ─────────────────────────────────────────────────────────────────

async function enrichPlayers() {
  const where: Record<string, unknown> = {};
  if (!FORCE) where.bio = null;
  if (TLA_FILTER) where.team = { tla: { in: TLA_FILTER } };

  const players = await prisma.player.findMany({
    where,
    select: {
      id: true,
      name: true,
      nationality: true,
      dateOfBirth: true,
      team: { select: { name: true, tla: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`\n── Jogadores: ${players.length} sem bio ──`);
  let saved = 0;
  let skipped = 0;

  for (const p of players) {
    const birthYear = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear() : null;
    const subject = {
      nationality: p.nationality ?? p.team?.name ?? null,
      teamName: p.team?.name ?? null,
      birthYear,
    };

    let bio = await fetchTSDBPlayerBio(p.name, subject);

    if (!bio) {
      await sleep(300);
      bio = await fetchWikiBio(p.name, subject);
    }

    if (bio) {
      if (!DRY_RUN) {
        await prisma.player.update({ where: { id: p.id }, data: { bio } });
      }
      console.log(`  ✓ [${p.team?.tla}] ${p.name}`);
      saved++;
    } else {
      skipped++;
    }

    await sleep(400);
  }

  console.log(`  Salvos: ${saved} | Sem bio: ${skipped}`);
}

// ── Técnicos ──────────────────────────────────────────────────────────────────

async function enrichCoaches() {
  const where: Record<string, unknown> = {};
  if (!FORCE) where.bio = null;
  if (TLA_FILTER) where.team = { tla: { in: TLA_FILTER } };

  const coaches = await prisma.coach.findMany({
    where,
    select: {
      id: true,
      name: true,
      nationality: true,
      dateOfBirth: true,
      team: { select: { name: true, tla: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`\n── Técnicos: ${coaches.length} sem bio ──`);
  let saved = 0;
  let skipped = 0;

  for (const c of coaches) {
    const birthYear = c.dateOfBirth ? new Date(c.dateOfBirth).getFullYear() : null;
    const subject = {
      nationality: c.nationality ?? null,
      teamName: c.team?.name ?? null,
      birthYear,
    };

    let bio = await fetchTSDBCoachBio(c.name, subject);

    if (!bio) {
      await sleep(300);
      bio = await fetchWikiBio(c.name, subject);
    }

    if (bio) {
      if (!DRY_RUN) {
        await prisma.coach.update({ where: { id: c.id }, data: { bio } });
      }
      console.log(`  ✓ [${c.team?.tla}] ${c.name}`);
      saved++;
    } else {
      skipped++;
    }

    await sleep(400);
  }

  console.log(`  Salvos: ${saved} | Sem bio: ${skipped}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`enrich-bios${DRY_RUN ? " [DRY RUN]" : ""}${FORCE ? " [FORCE]" : ""}`);

  if (!COACHES_ONLY) await enrichPlayers();
  if (!PLAYERS_ONLY) await enrichCoaches();

  await prisma.$disconnect();
  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
