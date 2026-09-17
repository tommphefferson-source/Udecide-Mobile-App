import { TtlCache, fetchText, mapLimit } from "./fetchCache";
import { parseHouseRollCall, categorize, type HouseRollCall } from "./parse";
import type {
  LegislativeVote,
  OfficialQuery,
  OfficialResolution,
  VotingRecordProvider,
} from "./types";

/**
 * U.S. House of Representatives provider — official roll-call XML from the
 * Office of the Clerk (no API key required):
 *   machine: https://clerk.house.gov/evs/{year}/roll{NNN}.xml
 *   human:   https://clerk.house.gov/Votes/{year}{NNN}
 * The `name-id` attribute on each recorded vote is the member's bioguide id,
 * which is the preferred stable identifier for matching.
 */

const PROVIDER_NAME = "U.S. House of Representatives — Office of the Clerk";

const rollCache = new TtlCache<HouseRollCall | null>(12 * 60 * 60 * 1000, 400);
const latestCache = new TtlCache<number>(15 * 60 * 1000, 4);

function rollUrl(year: number, roll: number): string {
  return `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
}

async function rollExists(year: number, roll: number): Promise<boolean> {
  try {
    return (await fetchText(rollUrl(year, roll))) !== null;
  } catch {
    return false;
  }
}

/** Binary-search the highest existing roll number for a year (rolls are sequential). */
export async function findLatestRoll(year: number): Promise<number> {
  const cached = latestCache.get(String(year));
  if (cached !== undefined) return cached;
  let lo = 0; // known-existing (0 = none)
  let hi = 1;
  while (hi <= 1024 && (await rollExists(year, hi))) {
    lo = hi;
    hi *= 2;
  }
  if (lo === 0) {
    latestCache.set(String(year), 0);
    return 0;
  }
  hi = Math.min(hi, 1200);
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (await rollExists(year, mid)) lo = mid;
    else hi = mid;
  }
  latestCache.set(String(year), lo);
  return lo;
}

async function getRoll(year: number, roll: number): Promise<HouseRollCall | null> {
  const key = `${year}-${roll}`;
  const cached = rollCache.get(key);
  if (cached !== undefined) return cached;
  const xml = await fetchText(rollUrl(year, roll));
  const parsed = xml ? parseHouseRollCall(xml) : null;
  rollCache.set(key, parsed);
  return parsed;
}

function normalizeLast(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "Greene (GA)" → "Greene "
    .replace(/[^a-z\s'-]/g, "")
    .split(/\s+/)
    .filter((p) => p && !["jr", "sr", "ii", "iii", "iv"].includes(p));
  return parts[parts.length - 1] ?? "";
}

export const houseProvider: VotingRecordProvider = {
  providerId: "us-house-clerk",

  supportsOfficial(o: OfficialQuery): boolean {
    if (o.level !== "federal") return false;
    const office = (o.office ?? "").toLowerCase();
    return office.includes("represent") || office.includes("congress");
  },

  async getVotes(official, { limit }) {
    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() - 1];
    // Scan enough recent rolls to fill `limit` member votes (each roll the
    // member voted in yields one record; absences still appear as Not Voting).
    const scanTarget = Math.min(Math.max(limit + 5, 20), 150);

    const rollRefs: { year: number; roll: number }[] = [];
    for (const year of years) {
      if (rollRefs.length >= scanTarget) break;
      const latest = await findLatestRoll(year);
      for (let r = latest; r >= 1 && rollRefs.length < scanTarget; r--) {
        rollRefs.push({ year, roll: r });
      }
    }

    const rolls = (
      await mapLimit(rollRefs, 5, ({ year, roll }) => getRoll(year, roll))
    ).filter((r): r is HouseRollCall => r !== null);

    // Identity resolution: prefer the stable bioguide id; else last name +
    // state, refusing ambiguity rather than guessing.
    let resolution: OfficialResolution;
    const wantedBioguide = official.identifiers?.bioguideId;
    if (wantedBioguide) {
      resolution = { matched: true, via: "bioguideId", memberKey: wantedBioguide };
    } else {
      const last = normalizeLast(official.name);
      const ids = new Set<string>();
      for (const roll of rolls) {
        for (const mv of roll.members) {
          if (mv.state === official.state.toUpperCase() && normalizeLast(mv.lastName) === last) {
            ids.add(mv.bioguideId);
          }
        }
      }
      if (ids.size === 1) {
        resolution = { matched: true, via: "name-state-unique", memberKey: [...ids][0] };
      } else if (ids.size === 0) {
        return { resolution: { matched: false, reason: "not-found" }, votes: [] };
      } else {
        return { resolution: { matched: false, reason: "ambiguous" }, votes: [] };
      }
    }

    const retrievedAt = new Date().toISOString();
    const votes: LegislativeVote[] = [];
    for (const roll of rolls) {
      const mv = roll.members.find((x) => x.bioguideId === resolution.memberKey);
      if (!mv) continue;
      const year = Number(roll.voteDate.slice(0, 4));
      votes.push({
        id: `us-house-${roll.congress}-${roll.session}-${roll.rollNumber}`,
        governmentLevel: "federal",
        jurisdiction: "US",
        chamber: "House",
        congress: roll.congress,
        session: roll.session,
        voteNumber: String(roll.rollNumber),
        billNumber: roll.billNumber,
        billTitle: roll.billTitle,
        question: roll.question,
        category: categorize(roll.question, roll.billNumber),
        voteDate: roll.voteDate,
        officialVote: mv.vote,
        result: roll.result,
        yeaCount: roll.yeaCount,
        nayCount: roll.nayCount,
        presentCount: roll.presentCount,
        notVotingCount: roll.notVotingCount,
        sourceProvider: PROVIDER_NAME,
        sourceUrl: `https://clerk.house.gov/Votes/${year}${roll.rollNumber}`,
        retrievedAt,
      });
    }
    votes.sort((a, b) => b.voteDate.localeCompare(a.voteDate) || b.id.localeCompare(a.id));
    return { resolution, votes };
  },
};
