/**
 * FUNCTIONAL TESTS — pure utility functions in src/lib/utils.ts
 *
 * Covers: normStr, nameMatch, nationalityMatch, namesMatch, calcAge, isBetterName
 */

import {
  normStr,
  nameMatch,
  nationalityMatch,
  namesMatch,
  calcAge,
  isBetterName,
} from "@/lib/utils";

// ── normStr ───────────────────────────────────────────────────────────────────

describe("normStr", () => {
  it("lowercases and trims", () => {
    expect(normStr("  Neymar  ")).toBe("neymar");
  });

  it("strips diacritics", () => {
    expect(normStr("Vinícius Júnior")).toBe("vinicius junior");
    expect(normStr("Kylian Mbappé")).toBe("kylian mbappe");
    expect(normStr("Lamine Yamal")).toBe("lamine yamal");
  });

  it("handles already-normalized strings", () => {
    expect(normStr("bellingham")).toBe("bellingham");
  });
});

// ── nameMatch ─────────────────────────────────────────────────────────────────

describe("nameMatch", () => {
  it("exact match", () => {
    expect(nameMatch("Bellingham", "Bellingham")).toBe(true);
  });

  it("case-insensitive and diacritic-tolerant", () => {
    expect(nameMatch("Vinícius Júnior", "Vinicius Junior")).toBe(true);
  });

  it("substring match — full name contains short name", () => {
    expect(nameMatch("Neymar", "Neymar da Silva Santos Junior")).toBe(true);
  });

  it("abbreviated first name: J. Bellingham vs Jude Bellingham", () => {
    expect(nameMatch("J. Bellingham", "Jude Bellingham")).toBe(true);
  });

  it("last-name-only match when last name is long enough", () => {
    expect(nameMatch("Bellingham", "Jude Bellingham")).toBe(true);
  });

  it("returns false for unrelated names", () => {
    expect(nameMatch("Messi", "Cristiano Ronaldo")).toBe(false);
  });

  it("returns false for undefined b", () => {
    expect(nameMatch("Messi", undefined)).toBe(false);
  });

  it("short name matches via substring — 'Lee' found in 'Park Ji Lee'", () => {
    // nameMatch uses substring check before the length guard, so 3-char names
    // can still match when they appear as substrings. Acceptable for our use case.
    expect(nameMatch("Lee", "Park Ji Lee")).toBe(true);
  });
});

// ── nationalityMatch ──────────────────────────────────────────────────────────

describe("nationalityMatch", () => {
  it("exact match", () => {
    expect(nationalityMatch("Brazil", "Brazil")).toBe(true);
  });

  it("suffix stripping: Brazilian ↔ Brazil", () => {
    expect(nationalityMatch("Brazilian", "Brazil")).toBe(true);
    expect(nationalityMatch("Brazil", "Brazilian")).toBe(true);
  });

  it("nationalities stored as country names — Spanish/Spain do NOT match (adjective forms not used)", () => {
    // DB stores "Spain", TM returns "Spain" — adjective forms like "Spanish" never appear.
    // normNat("Spanish") → "span", normNat("Spain") → "spain" — no match by design.
    expect(nationalityMatch("Spanish", "Spain")).toBe(false);
  });

  it("returns false for null inputs", () => {
    expect(nationalityMatch(null, "Brazil")).toBe(false);
    expect(nationalityMatch("Brazil", null)).toBe(false);
  });

  it("returns false for clearly different nationalities", () => {
    expect(nationalityMatch("Brazil", "Argentina")).toBe(false);
  });
});

// ── namesMatch (Understat / word-set) ─────────────────────────────────────────

describe("namesMatch", () => {
  it("exact match", () => {
    expect(namesMatch("Bellingham", "Bellingham")).toBe(true);
  });

  it("all words of shorter name found in longer name", () => {
    expect(namesMatch("Vinicius Junior", "Vinicius Junior da Silva")).toBe(true);
  });

  it("mononym as last word of longer name (length > 4)", () => {
    expect(namesMatch("Neymar", "Neymar da Silva Santos Junior")).toBe(false); // 'neymar' is NOT the last word
    expect(namesMatch("Junior", "Vinicius Junior")).toBe(true);
  });

  it("mononym too short (≤4 chars) does not match", () => {
    expect(namesMatch("Melo", "Fabinho Melo")).toBe(false); // 'melo' is 4 chars, not > 4
  });

  // ── Regression: false positives fixed in stats enrichment ──────────────────

  it("REGRESSION: Rodri should not match Brian Rodríguez (substring was matching)", () => {
    // Old bug: 'rodriguez'.includes('rodri') = true
    // Fix: word-set matching requires 'rodri' to appear as a whole word in 'brian rodriguez'
    expect(namesMatch("Rodri", "Brian Rodriguez")).toBe(false);
  });

  it("REGRESSION: Javier Rodríguez should not match José Luis Rodríguez", () => {
    // Old bug: last-name + first-initial rule matched shared surname + J initial
    // Fix: removed last-name+initial rule entirely
    expect(namesMatch("Javier Rodriguez", "Jose Luis Rodriguez")).toBe(false);
  });

  it("legitimate multi-word match still works", () => {
    expect(namesMatch("Lamine Yamal", "Lamine Yamal Nasraoui Ebana")).toBe(true);
  });
});

// ── calcAge ───────────────────────────────────────────────────────────────────

describe("calcAge", () => {
  it("returns null for null dob", () => {
    expect(calcAge(null)).toBeNull();
  });

  it("calculates age correctly", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    expect(calcAge(dob)).toBe(25);
  });

  it("birthday not yet reached this year = one year less", () => {
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const dob = new Date(today.getFullYear() - 25, nextMonth, 15);
    expect(calcAge(dob)).toBe(24);
  });

  it("birthday exactly today = age already counted", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    expect(calcAge(dob)).toBe(20);
  });
});

// ── isBetterName ──────────────────────────────────────────────────────────────

describe("isBetterName", () => {
  it("returns true when firstName contains mononym as whole word and is longer", () => {
    expect(isBetterName("Thiago", "Igor Thiago")).toBe(true);
  });

  it("returns false when candidate is same", () => {
    expect(isBetterName("Neymar", "Neymar")).toBe(false);
  });

  it("returns false when candidate does not contain current name as whole word", () => {
    expect(isBetterName("Marc", "Marcus Rashford")).toBe(false);
  });

  it("returns false when candidate is shorter", () => {
    expect(isBetterName("Vinicius Junior", "Junior")).toBe(false);
  });

  it("returns false when candidate exceeds 4 words (avoids legal names)", () => {
    expect(isBetterName("Thiago", "Igor Thiago de Queiroz Neto")).toBe(false);
  });

  it("REGRESSION: Marc Cucurella should not become Marcus", () => {
    // 'marc' is not a whole word inside 'marcus'
    expect(isBetterName("Marc", "Marcus")).toBe(false);
  });
});
