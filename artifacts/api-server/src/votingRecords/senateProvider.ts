import { TtlCache, fetchText, mapLimit } from "./fetchCache";
import {
  parseSenateRollCall,
  parseSenateVoteMenu,
  categorize,
  type SenateRollCall,
} from "./parse";
import type {
  LegislativeVote,
  OfficialQuery,
  OfficialResolution,
  VotingRecordProvider,
} from "./types";

/**
 * U.S. Senate provider — official LIS roll-call XML (no API key required):
 *   menu:  https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{congress}_{session}.xml
 *   vote:  https://www.senate.gov/legislative/LIS/roll_call_votes/vote{c}{s}/vote_{c}_{s}_{NNNNN}.xml
 *   human: https://www.senate.gov/legislative/LIS/roll_call_lists/roll_call_vote_cfm.cfm?congress=&session=&vote=
 * Senators are matched by last name + state (two senators per state; a
 * same-name collision within a state is treated as ambiguous, never guessed).
 */

const PROVIDER_NAME = "U.S. Senate";

const menuCache = new TtlCache<number[]>(15 * 60 * 1000, 4);
const voteCache = new TtlCache<SenateRollCall | null>(12 * 60 * 60 * 1000, 400);

/** Current congress/session pairs to scan, newest first. */
export function currentSessions(now = new Date()): { congress: number; session: number }[] {
  const year = now.getFullYear();
  const congress = Math.floor((year - 1789) / 2) + 1;
  const session = year % 2 === 1 ? 1 : 2;
  return session === 2
    ? [
        { congress, session: 2 },
        { congress, session: 1 },
      ]
    : [{ congress, session: 1 }];
}

async function getVoteNumbers(congress: number, session: number): Promise<number[]> {
  const key = `${congress}-${session}`;
  const cached = menuCache.get(key);
  if (cached !== undefined) return cached;
  const xml = await fetchText(
    `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`,
  );
  const entries = xml ? parseSenateVoteMenu(xml) : null;
  const numbers = (entries ?? []).map((e) => e.voteNumber).sort((a, b) => b - a);
  menuCache.set(key, numbers);
  return numbers;
}

async function getVote(
  congress: number,
  session: number,
  voteNumber: number,
): Promise<SenateRollCall | null> {
  const key = `${congress}-${session}-${voteNumber}`;
  const cached = voteCache.get(key);
  if (cached !== undefined) return cached;
  const xml = await fetchText(
    `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(voteNumber).padStart(5, "0")}.xml`,
  );
  const parsed = xml ? parseSenateRollCall(xml) : null;
  voteCache.set(key, parsed);
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

export const senateProvider: VotingRecordProvider = {
  providerId: "us-senate-lis",

  supportsOfficial(o: OfficialQuery): boolean {
    return o.level === "federal" && (o.office ?? "").toLowerCase().includes("senat");
  },

  async getVotes(official, { limit }) {
    const scanTarget = Math.min(Math.max(limit + 5, 20), 150);
    const refs: { congress: number; session: number; voteNumber: number }[] = [];
    for (const { congress, session } of currentSessions()) {
      if (refs.length >= scanTarget) break;
      const numbers = await getVoteNumbers(congress, session);
      for (const n of numbers) {
        if (refs.length >= scanTarget) break;
        refs.push({ congress, session, voteNumber: n });
      }
    }

    const rolls = (
      await mapLimit(refs, 5, (r) => getVote(r.congress, r.session, r.voteNumber))
    ).filter((r): r is SenateRollCall => r !== null);

    // Resolve by lis_member_id when the caller has one, else last name + state.
    let resolution: OfficialResolution;
    const wantedLis = official.identifiers?.externalIds?.lisMemberId;
    if (wantedLis) {
      resolution = { matched: true, via: "bioguideId", memberKey: wantedLis };
    } else {
      const last = normalizeLast(official.name);
      const keys = new Set<string>();
      for (const roll of rolls) {
        for (const mv of roll.members) {
          if (mv.state === official.state.toUpperCase() && normalizeLast(mv.lastName) === last) {
            keys.add(mv.lisMemberId || `${mv.lastName}|${mv.state}`);
          }
        }
      }
      if (keys.size === 1) {
        resolution = { matched: true, via: "name-state-unique", memberKey: [...keys][0] };
      } else if (keys.size === 0) {
        return { resolution: { matched: false, reason: "not-found" }, votes: [] };
      } else {
        return { resolution: { matched: false, reason: "ambiguous" }, votes: [] };
      }
    }

    const retrievedAt = new Date().toISOString();
    const votes: LegislativeVote[] = [];
    for (const roll of rolls) {
      const mv = roll.members.find(
        (x) => (x.lisMemberId || `${x.lastName}|${x.state}`) === resolution.memberKey,
      );
      if (!mv) continue;
      votes.push({
        id: `us-senate-${roll.congress}-${roll.session}-${roll.voteNumber}`,
        governmentLevel: "federal",
        jurisdiction: "US",
        chamber: "Senate",
        congress: roll.congress,
        session: roll.session,
        voteNumber: String(roll.voteNumber),
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
        sourceUrl: `https://www.senate.gov/legislative/LIS/roll_call_lists/roll_call_vote_cfm.cfm?congress=${roll.congress}&session=${roll.session}&vote=${String(roll.voteNumber).padStart(5, "0")}`,
        retrievedAt,
      });
    }
    votes.sort((a, b) => b.voteDate.localeCompare(a.voteDate) || b.id.localeCompare(a.id));
    return { resolution, votes };
  },
};
