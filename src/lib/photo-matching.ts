/**
 * photo-matching.ts — Matching ESTRITO e determinístico para enriquecimento de fotos.
 *
 * Substitui a cascata frouxa que causava fotos de homônimos
 * (ex.: "Rayan" BRA recebendo a foto de Rayan Cherki FRA).
 *
 * Regras de ouro:
 *   1. Nacionalidade é OBRIGATÓRIA e comparada por país canônico (sem startsWith).
 *   2. Data de nascimento, quando disponível dos dois lados, é OBRIGATÓRIA.
 *   3. Nunca aceitar "resultado único" sem validar nacionalidade.
 *   4. Ambíguo = rejeitar e reportar (vira insumo para data/photo-overrides.json).
 *
 * Pure functions — sem I/O — para serem testáveis (ver __tests__/unit/photo-matching.test.ts).
 */

import { normStr, nameMatch } from "./utils";

// ── Grupos de posição ─────────────────────────────────────────────────────────

export type PosGroup = "gk" | "def" | "mid" | "fwd";

/** Sigla FIFA (formato do banco) → grupo. */
export const SIGLA_GROUP: Record<string, PosGroup> = {
  GK: "gk",
  CB: "def", RB: "def", LB: "def", SW: "def", RWB: "def", LWB: "def", DEF: "def",
  CDM: "mid", CM: "mid", CAM: "mid", RM: "mid", LM: "mid", MID: "mid",
  RW: "fwd", LW: "fwd", CF: "fwd", ST: "fwd", SS: "fwd", FWD: "fwd",
};

export function siglaToGroup(sigla: string | null | undefined): PosGroup | null {
  if (!sigla) return null;
  return SIGLA_GROUP[sigla.toUpperCase()] ?? null;
}

/** Posição em texto livre (TheSportsDB / strings legadas) → grupo. */
export function textPositionToGroup(pos: string | null | undefined): PosGroup | null {
  if (!pos) return null;
  const p = pos.toLowerCase();
  if (p.includes("goalkeeper") || p === "g") return "gk";
  if (p.includes("defender") || p.includes("back") || p.includes("defence") || p === "d") return "def";
  if (p.includes("midfield") || p === "m") return "mid";
  if (
    p.includes("forward") || p.includes("attacker") || p.includes("winger") ||
    p.includes("striker") || p.includes("offence") || p === "f"
  ) return "fwd";
  return null;
}

/** Posição da API-Football ("Goalkeeper" | "Defender" | "Midfielder" | "Attacker") → grupo. */
export function afPositionToGroup(pos: string | null | undefined): PosGroup | null {
  if (!pos) return null;
  const p = pos.toLowerCase();
  if (p.startsWith("goal")) return "gk";
  if (p.startsWith("def")) return "def";
  if (p.startsWith("mid")) return "mid";
  if (p.startsWith("att") || p.startsWith("for")) return "fwd";
  return null;
}

/** Grupos compatíveis? (desconhecido de um dos lados não desqualifica) */
export function posGroupsCompatible(a: PosGroup | null, b: PosGroup | null): boolean {
  if (!a || !b) return true;
  return a === b;
}

// ── País canônico ─────────────────────────────────────────────────────────────
//
// Cada linha é um grupo de equivalência: nome do país (football-data),
// variações comuns e o GENTÍLICO usado pela TheSportsDB.
// A comparação é SEMPRE por igualdade do canônico — nada de startsWith
// (que fazia "Austrian" ≈ "Australian").

const COUNTRY_GROUPS: string[][] = [
  ["argentina", "argentine", "argentinian"],
  ["australia", "australian"],
  ["austria", "austrian"],
  ["belgium", "belgian"],
  ["bosnia and herzegovina", "bosnia-herzegovina", "bosnia", "bosnian"],
  ["brazil", "brazilian", "brasil"],
  ["canada", "canadian"],
  ["cape verde", "cabo verde", "cape verdean", "cape verde islands"],
  ["colombia", "colombian"],
  ["costa rica", "costa rican"],
  ["croatia", "croatian"],
  ["curacao", "curaçao", "curacaoan"],
  ["czechia", "czech republic", "czech"],
  ["dr congo", "congo dr", "democratic republic of the congo", "dr congo (zaire)", "congolese"],
  ["denmark", "danish", "dane"],
  ["ecuador", "ecuadorian", "ecuadorean"],
  ["egypt", "egyptian"],
  ["england", "english"],
  ["france", "french"],
  ["germany", "german"],
  ["ghana", "ghanaian"],
  ["greece", "greek"],
  ["haiti", "haitian"],
  ["honduras", "honduran"],
  ["iran", "ir iran", "iranian"],
  ["iraq", "iraqi"],
  ["italy", "italian"],
  ["ivory coast", "cote d'ivoire", "côte d'ivoire", "ivorian"],
  ["jamaica", "jamaican"],
  ["japan", "japanese"],
  ["jordan", "jordanian"],
  ["mexico", "mexican"],
  ["morocco", "moroccan"],
  ["netherlands", "holland", "dutch"],
  ["new zealand", "new zealander", "nz"],
  ["nigeria", "nigerian"],
  ["norway", "norwegian"],
  ["panama", "panamanian"],
  ["paraguay", "paraguayan"],
  ["poland", "polish"],
  ["portugal", "portuguese"],
  ["qatar", "qatari"],
  ["saudi arabia", "saudi", "saudi arabian"],
  ["scotland", "scottish"],
  ["senegal", "senegalese"],
  ["serbia", "serbian"],
  ["south africa", "south african"],
  ["south korea", "korea republic", "republic of korea", "korean", "south korean"],
  ["spain", "spanish", "spaniard"],
  ["sweden", "swedish", "swede"],
  ["switzerland", "swiss"],
  ["tunisia", "tunisian"],
  ["turkey", "turkiye", "türkiye", "turkish"],
  ["united arab emirates", "uae", "emirati"],
  ["united states", "usa", "united states of america", "american", "us"],
  ["uruguay", "uruguayan"],
  ["uzbekistan", "uzbek", "uzbekistani"],
  ["venezuela", "venezuelan"],
  ["wales", "welsh"],
];

const COUNTRY_CANON: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const group of COUNTRY_GROUPS) {
    const canon = group[0];
    for (const variant of group) m.set(normStr(variant), canon);
  }
  return m;
})();

/**
 * Normaliza país/gentílico para a forma canônica.
 * Fora do mapa, retorna a string normalizada (igualdade exata ainda funciona
 * para países não listados — só a tolerância a gentílico que não).
 */
export function canonicalCountry(s: string | null | undefined): string | null {
  if (!s) return null;
  const n = normStr(s);
  if (!n) return null;
  return COUNTRY_CANON.get(n) ?? n;
}

/** Igualdade estrita por país canônico. Falta de dado de um lado = NÃO casa. */
export function strictNationalityMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalCountry(a);
  const cb = canonicalCountry(b);
  if (!ca || !cb) return false;
  return ca === cb;
}

// ── Data de nascimento ────────────────────────────────────────────────────────

/** Date (Prisma) ou ISO → "YYYY-MM-DD" (comparação date-only, sem fuso). */
export function toIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Compara DOBs.
 *   true  → ambos presentes e iguais
 *   false → ambos presentes e diferentes
 *   null  → não dá para comparar (algum lado ausente)
 */
export function dobMatches(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined
): boolean | null {
  const ia = toIsoDate(a);
  const ib = toIsoDate(b);
  if (!ia || !ib) return null;
  return ia === ib;
}

// ── TheSportsDB: seleção estrita de candidato ────────────────────────────────

export type SdbCandidate = {
  idPlayer?: string | null;
  strPlayer: string;
  strNationality?: string | null;
  strPosition?: string | null;
  strTeam?: string | null;
  strTeamLogo?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
  dateBorn?: string | null;
};

export type SdbTarget = {
  name: string;
  nationality: string | null;
  dateOfBirth: Date | string | null;
  posGroup: PosGroup | null;
};

export type SdbPickResult =
  | {
      ok: true;
      candidate: SdbCandidate;
      photo: string | null;
      confidence: "high" | "medium";
    }
  | {
      ok: false;
      reason:
        | "no-results"
        | "no-name-match"
        | "no-nationality-match"
        | "dob-mismatch"
        | "ambiguous";
      candidatesConsidered: number;
    };

function extractPhoto(c: SdbCandidate): string | null {
  // Preferir strCutout (PNG recortado — melhor nos cards) com fallback para strThumb.
  const url = c.strCutout ?? c.strThumb ?? null;
  if (!url || url.includes("placeholder")) return null;
  return url;
}

/**
 * Escolhe (ou rejeita) um candidato da TheSportsDB para o jogador-alvo.
 *
 * Pipeline: nome → nacionalidade ESTRITA (obrigatória) → DOB (obrigatória
 * quando comparável) → posição (desempate) → foto (desempate final).
 * Sobrou exatamente 1 → match. 0 ou >1 → rejeita com motivo.
 */
export function pickSdbCandidate(target: SdbTarget, candidates: SdbCandidate[]): SdbPickResult {
  if (!candidates.length) return { ok: false, reason: "no-results", candidatesConsidered: 0 };

  const byName = candidates.filter((c) => nameMatch(target.name, c.strPlayer));
  if (!byName.length) {
    return { ok: false, reason: "no-name-match", candidatesConsidered: candidates.length };
  }

  // 1) Nacionalidade estrita — OBRIGATÓRIA (mata o fallback "resultado único").
  const byNat = byName.filter((c) => strictNationalityMatch(target.nationality, c.strNationality));
  if (!byNat.length) {
    return { ok: false, reason: "no-nationality-match", candidatesConsidered: byName.length };
  }

  // 2) DOB — obrigatória quando os dois lados têm o dado.
  let pool = byNat;
  let dobConfirmed = false;
  const comparable = byNat.filter((c) => dobMatches(target.dateOfBirth, c.dateBorn) !== null);
  if (comparable.length) {
    const exact = comparable.filter((c) => dobMatches(target.dateOfBirth, c.dateBorn) === true);
    if (!exact.length) {
      return { ok: false, reason: "dob-mismatch", candidatesConsidered: comparable.length };
    }
    pool = exact;
    dobConfirmed = true;
  }

  // 3) Posição como desempate (nunca desqualifica sozinha se desconhecida).
  if (pool.length > 1) {
    const byPos = pool.filter((c) =>
      posGroupsCompatible(target.posGroup, textPositionToGroup(c.strPosition))
    );
    if (byPos.length) pool = byPos;
  }

  // 4) Desempate final: candidato que efetivamente tem foto utilizável.
  if (pool.length > 1) {
    const withPhoto = pool.filter((c) => extractPhoto(c) !== null);
    if (withPhoto.length === 1) pool = withPhoto;
  }

  if (pool.length !== 1) {
    return { ok: false, reason: "ambiguous", candidatesConsidered: pool.length };
  }

  const candidate = pool[0];
  return {
    ok: true,
    candidate,
    photo: extractPhoto(candidate),
    confidence: dobConfirmed ? "high" : "medium",
  };
}

// ── API-Football: match dentro do elenco da seleção ──────────────────────────
//
// Escopo minúsculo (≤ ~30 jogadores, todos da mesma seleção) ⇒ o risco de
// homônimo global desaparece. Camisa é quase chave primária dentro do elenco.

export type AfSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

export type AfTarget = {
  name: string;
  shirtNumber: number | null;
  age: number | null;
  posGroup: PosGroup | null;
};

export function matchAfSquadPlayer(target: AfTarget, squad: AfSquadPlayer[]): AfSquadPlayer | null {
  if (!squad.length) return null;

  // 1) Camisa — única por elenco. Exige ao menos UM sinal secundário coerente.
  if (target.shirtNumber != null) {
    const sameNumber = squad.filter((s) => s.number === target.shirtNumber);
    if (sameNumber.length === 1) {
      const s = sameNumber[0];
      const nameOk = nameMatch(target.name, s.name);
      const posOk = posGroupsCompatible(target.posGroup, afPositionToGroup(s.position));
      const ageOk = target.age != null && s.age != null && Math.abs(target.age - s.age) <= 2;
      if (nameOk || (posOk && ageOk)) return s;
    }
  }

  // 2) Nome dentro do elenco (escopo seguro para nameMatch frouxo).
  let byName = squad.filter((s) => nameMatch(target.name, s.name));
  if (byName.length > 1 && target.age != null) {
    const byAge = byName.filter((s) => s.age != null && Math.abs(target.age! - s.age) <= 1);
    if (byAge.length) byName = byAge;
  }
  if (byName.length > 1) {
    const byPos = byName.filter((s) =>
      posGroupsCompatible(target.posGroup, afPositionToGroup(s.position))
    );
    if (byPos.length) byName = byPos;
  }
  if (byName.length === 1) return byName[0];

  return null; // ambíguo ou ausente → vai para o relatório
}

/** URL canônica da foto na CDN da API-Football (hotlink público, sem chave). */
export function afPhotoUrl(afPlayerId: number): string {
  return `https://media.api-sports.io/football/players/${afPlayerId}.png`;
}
