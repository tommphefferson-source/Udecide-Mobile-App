import type { MatchConfidence, OfficialRegistryEntry } from "./types";

/**
 * Identity resolution between elected-official records and voter-file rows.
 *
 * The bar for automatic publication is deliberately high: a common name alone
 * is never enough. Records that could plausibly belong to more than one person
 * come back AMBIGUOUS and go to the review queue instead of the app.
 */

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Lowercase, strip punctuation/diacritics, drop generational suffixes. */
export function normalizeName(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/['-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !SUFFIXES.has(tok));
  return tokens.join(" ");
}

/** First + last token only ("brian p kemp" → "brian kemp"). */
export function firstLast(normalized: string): string {
  const parts = normalized.split(" ");
  if (parts.length <= 2) return normalized;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** A candidate voter-file identity row (already stripped to matching fields). */
export interface VoterFileCandidate {
  normalizedName: string;
  birthYear?: number;
  county?: string;
  /** Opaque per-file identifier hash used for provenance, never exposed. */
  recordId: string;
}

export interface MatchResult {
  confidence: MatchConfidence;
  candidate?: VoterFileCandidate;
  reason: string;
}

/**
 * Match one official against all candidate voter-file rows that share a
 * normalized first+last name.
 *
 * Rules (conservative by design):
 *  - 0 candidates                          → NO_MATCH
 *  - 1 candidate + birth-year corroborated → MATCHED
 *  - 1 candidate + county corroborated     → MATCHED
 *  - 1 candidate, no corroboration         → PROBABLE_MATCH (not published)
 *  - >1 candidates, exactly one corroborated by birth year → MATCHED
 *  - >1 candidates otherwise               → AMBIGUOUS (review queue)
 */
export function matchOfficial(
  official: OfficialRegistryEntry,
  candidates: VoterFileCandidate[],
): MatchResult {
  const target = firstLast(official.normalizedName);
  const named = candidates.filter((c) => firstLast(c.normalizedName) === target);

  if (named.length === 0) {
    return { confidence: "NO_MATCH", reason: "no voter-file row with this name" };
  }

  const byBirthYear =
    official.match.birthYear !== undefined
      ? named.filter((c) => c.birthYear === official.match.birthYear)
      : [];

  if (named.length === 1) {
    const only = named[0];
    if (byBirthYear.length === 1) {
      return { confidence: "MATCHED", candidate: only, reason: "unique name + birth year" };
    }
    if (
      official.match.registrationCounty &&
      only.county &&
      only.county.toLowerCase() === official.match.registrationCounty.toLowerCase()
    ) {
      return { confidence: "MATCHED", candidate: only, reason: "unique name + county" };
    }
    return {
      confidence: "PROBABLE_MATCH",
      candidate: only,
      reason: "unique name, no corroborating attribute",
    };
  }

  if (byBirthYear.length === 1) {
    return {
      confidence: "MATCHED",
      candidate: byBirthYear[0],
      reason: `birth year disambiguated ${named.length} candidates`,
    };
  }

  return {
    confidence: "AMBIGUOUS",
    reason: `${named.length} voter-file rows share this name; needs manual review`,
  };
}

/** Only MATCHED records may be published automatically. */
export function isPublishableMatch(confidence: MatchConfidence): boolean {
  return confidence === "MATCHED";
}
