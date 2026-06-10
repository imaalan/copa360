/**
 * UNIT TESTS — src/lib/photo-matching.ts
 *
 * Inclui os CASOS DE REGRESSÃO reais que motivaram a reescrita:
 *   - "Rayan" (BRA) recebendo a foto de Rayan Cherki (FRA)
 *   - nationalityMatch antigo aceitando Austria ≈ Australia via startsWith
 */

import {
  canonicalCountry,
  strictNationalityMatch,
  dobMatches,
  toIsoDate,
  siglaToGroup,
  textPositionToGroup,
  afPositionToGroup,
  pickSdbCandidate,
  matchAfSquadPlayer,
  afPhotoUrl,
  type SdbCandidate,
} from "@/lib/photo-matching";

// ── canonicalCountry / strictNationalityMatch ────────────────────────────────

describe("canonicalCountry", () => {
  it("maps demonyms to country", () => {
    expect(canonicalCountry("Brazilian")).toBe("brazil");
    expect(canonicalCountry("French")).toBe("france");
    expect(canonicalCountry("Dutch")).toBe("netherlands");
    expect(canonicalCountry("American")).toBe("united states");
  });

  it("normalizes aliases", () => {
    expect(canonicalCountry("USA")).toBe("united states");
    expect(canonicalCountry("Korea Republic")).toBe("south korea");
    expect(canonicalCountry("Côte d'Ivoire")).toBe("ivory coast");
    expect(canonicalCountry("Cabo Verde")).toBe("cape verde");
    expect(canonicalCountry("Czech Republic")).toBe("czechia");
  });

  it("returns normalized string for unmapped countries (exact match still possible)", () => {
    expect(canonicalCountry("Atlantis")).toBe("atlantis");
  });
});

describe("strictNationalityMatch", () => {
  it("matches country vs demonym", () => {
    expect(strictNationalityMatch("Brazil", "Brazilian")).toBe(true);
    expect(strictNationalityMatch("Netherlands", "Dutch")).toBe(true);
  });

  it("REGRESSÃO: Austria NÃO é Australia (bug do startsWith antigo)", () => {
    expect(strictNationalityMatch("Austria", "Australia")).toBe(false);
    expect(strictNationalityMatch("Austrian", "Australian")).toBe(false);
  });

  it("missing data never matches", () => {
    expect(strictNationalityMatch(null, "Brazil")).toBe(false);
    expect(strictNationalityMatch("Brazil", null)).toBe(false);
  });
});

// ── DOB ───────────────────────────────────────────────────────────────────────

describe("dobMatches / toIsoDate", () => {
  it("compares date-only across Date and ISO string", () => {
    expect(dobMatches(new Date("2006-05-08T00:00:00.000Z"), "2006-05-08")).toBe(true);
    expect(dobMatches(new Date("2003-08-17T00:00:00.000Z"), "2006-05-08")).toBe(false);
  });

  it("returns null when one side is missing (can't compare)", () => {
    expect(dobMatches(null, "2006-05-08")).toBeNull();
    expect(dobMatches(new Date("2006-05-08"), undefined)).toBeNull();
  });

  it("toIsoDate handles malformed strings", () => {
    expect(toIsoDate("2006-05-08T12:00:00Z")).toBe("2006-05-08");
    expect(toIsoDate("garbage")).toBeNull();
  });
});

// ── Position groups ───────────────────────────────────────────────────────────

describe("position groups", () => {
  it("sigla → group", () => {
    expect(siglaToGroup("ST")).toBe("fwd");
    expect(siglaToGroup("CDM")).toBe("mid");
    expect(siglaToGroup("GK")).toBe("gk");
    expect(siglaToGroup(null)).toBeNull();
  });

  it("free text → group", () => {
    expect(textPositionToGroup("Attacking Midfield")).toBe("mid");
    expect(textPositionToGroup("Winger")).toBe("fwd");
  });

  it("API-Football → group", () => {
    expect(afPositionToGroup("Attacker")).toBe("fwd");
    expect(afPositionToGroup("Goalkeeper")).toBe("gk");
  });
});

// ── pickSdbCandidate — o coração da correção ─────────────────────────────────

const CHERKI: SdbCandidate = {
  idPlayer: "34161045",
  strPlayer: "Rayan Cherki",
  strNationality: "France",
  strPosition: "Attacking Midfield",
  dateBorn: "2003-08-17",
  strCutout: "https://r2.thesportsdb.com/images/media/player/cutout/cherki.png",
};

const RAYAN_BRA: SdbCandidate = {
  idPlayer: "99999999",
  strPlayer: "Rayan",
  strNationality: "Brazil",
  strPosition: "Forward",
  dateBorn: "2006-05-08",
  strCutout: "https://r2.thesportsdb.com/images/media/player/cutout/rayan.png",
};

const RAYAN_TARGET = {
  name: "Rayan",
  nationality: "Brazil",
  dateOfBirth: new Date("2006-05-08T00:00:00.000Z"),
  posGroup: "fwd" as const,
};

describe("pickSdbCandidate", () => {
  it("REGRESSÃO RAYAN: rejeita homônimo único de outra nacionalidade", () => {
    // Cenário exato do bug: SDB devolve só o Cherki para a busca "Rayan".
    // O código antigo aceitava via fallback `byName.length === 1`.
    const result = pickSdbCandidate(RAYAN_TARGET, [CHERKI]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-nationality-match");
  });

  it("REGRESSÃO RAYAN: escolhe o brasileiro quando ambos existem", () => {
    const result = pickSdbCandidate(RAYAN_TARGET, [CHERKI, RAYAN_BRA]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.idPlayer).toBe("99999999");
      expect(result.confidence).toBe("high"); // DOB confirmada
      expect(result.photo).toContain("rayan.png");
    }
  });

  it("rejeita quando DOB comparável diverge (homônimos do mesmo país)", () => {
    const gabrielA: SdbCandidate = {
      strPlayer: "Gabriel",
      strNationality: "Brazil",
      dateBorn: "1997-12-19",
    };
    const result = pickSdbCandidate(
      { name: "Gabriel", nationality: "Brazil", dateOfBirth: new Date("2000-06-23"), posGroup: "def" },
      [gabrielA]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("dob-mismatch");
  });

  it("rejeita ambiguidade real em vez de chutar", () => {
    const a: SdbCandidate = { strPlayer: "Gabriel", strNationality: "Brazil", strCutout: "https://x/a.png" };
    const b: SdbCandidate = { strPlayer: "Gabriel Souza", strNationality: "Brazil", strCutout: "https://x/b.png" };
    const result = pickSdbCandidate(
      { name: "Gabriel", nationality: "Brazil", dateOfBirth: null, posGroup: null },
      [a, b]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ambiguous");
  });

  it("aceita match medium quando só nacionalidade confirma (sem DOB de nenhum lado)", () => {
    const only: SdbCandidate = { strPlayer: "Endrick", strNationality: "Brazil", strThumb: "https://x/e.jpg" };
    const result = pickSdbCandidate(
      { name: "Endrick", nationality: "Brazil", dateOfBirth: null, posGroup: "fwd" },
      [only]
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.confidence).toBe("medium");
  });

  it("ignora foto placeholder", () => {
    const ph: SdbCandidate = {
      strPlayer: "Endrick",
      strNationality: "Brazil",
      strThumb: "https://www.thesportsdb.com/images/placeholder.png",
    };
    const result = pickSdbCandidate(
      { name: "Endrick", nationality: "Brazil", dateOfBirth: null, posGroup: null },
      [ph]
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.photo).toBeNull();
  });
});

// ── matchAfSquadPlayer ────────────────────────────────────────────────────────

const AF_SQUAD = [
  { id: 101, name: "Alisson", age: 33, number: 1, position: "Goalkeeper", photo: "https://media.api-sports.io/football/players/101.png" },
  { id: 102, name: "Rayan Vitor", age: 20, number: 19, position: "Attacker", photo: "https://media.api-sports.io/football/players/102.png" },
  { id: 103, name: "Vinícius Júnior", age: 25, number: 7, position: "Attacker", photo: "https://media.api-sports.io/football/players/103.png" },
];

describe("matchAfSquadPlayer", () => {
  it("match por camisa com sinal secundário (posição+idade)", () => {
    const m = matchAfSquadPlayer(
      { name: "Alisson Becker", shirtNumber: 1, age: 33, posGroup: "gk" },
      AF_SQUAD
    );
    expect(m?.id).toBe(101);
  });

  it("mononímio casa dentro do escopo do elenco ('Rayan' → 'Rayan Vitor')", () => {
    const m = matchAfSquadPlayer(
      { name: "Rayan", shirtNumber: null, age: 20, posGroup: "fwd" },
      AF_SQUAD
    );
    expect(m?.id).toBe(102);
  });

  it("retorna null quando ausente (vai para o relatório, não chuta)", () => {
    const m = matchAfSquadPlayer(
      { name: "Neymar", shirtNumber: 10, age: 34, posGroup: "fwd" },
      AF_SQUAD
    );
    expect(m).toBeNull();
  });
});

describe("afPhotoUrl", () => {
  it("monta a URL pública da CDN", () => {
    expect(afPhotoUrl(276)).toBe("https://media.api-sports.io/football/players/276.png");
  });
});
