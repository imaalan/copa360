/** Shared pure utilities — stable logic extracted for testability. */

export function normStr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function normNat(s: string): string {
  return normStr(s).replace(/ian$|ese$|ish$|an$/, "");
}

/** Fuzzy name match: exact, substring, or last-name match. */
export function nameMatch(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const na = normStr(a).replace(/-/g, " "), nb = normStr(b).replace(/-/g, " ");
  if (na === nb || nb.includes(na) || na.includes(nb)) return true;
  // Abbreviated first name: "J. Bellingham" vs "Jude Bellingham"
  const aLast = na.split(" ").slice(-1)[0];
  const bLast = nb.split(" ").slice(-1)[0];
  return aLast.length > 3 && aLast === bLast;
}

/** Nationality match tolerating linguistic suffixes (Brazilian/Brazil, etc.). */
export function nationalityMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normNat(a), nb = normNat(b);
  return na === nb || na.startsWith(nb.slice(0, 4)) || nb.startsWith(na.slice(0, 4));
}

/** Word-set match used for stats enrichment (Understat names). */
export function namesMatch(a: string, b: string): boolean {
  const na = normStr(a), nb = normStr(b);
  if (na === nb) return true;
  const aw = na.split(" "), bw = nb.split(" ");
  const aSet = new Set(aw), bSet = new Set(bw);
  const [shorter, longerSet] = aw.length <= bw.length ? [aw, bSet] : [bw, aSet];
  if (shorter.length >= 2 && shorter.every(w => longerSet.has(w))) return true;
  // Mononym: the single word must be the last word of the longer name (length > 4)
  if (shorter.length === 1 && shorter[0].length > 4) {
    const longerWords = aw.length <= bw.length ? bw : aw;
    return longerWords[longerWords.length - 1] === shorter[0];
  }
  return false;
}

/** Returns age in full years from date-of-birth, or null if unknown. */
export function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/** Returns true if candidate is a better (more complete) name than current. */
export function isBetterName(current: string, candidate: string): boolean {
  if (!candidate || candidate === current) return false;
  const currentNorm = normStr(current);
  const candidateNorm = normStr(candidate);
  const words = candidateNorm.split(" ");
  if (!words.some(w => w === currentNorm)) return false;
  if (candidateNorm.length <= currentNorm.length) return false;
  if (words.length > 4) return false;
  return true;
}
