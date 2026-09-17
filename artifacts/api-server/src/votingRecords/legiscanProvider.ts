import {
  getBill,
  getMasterList,
  getRollCall,
  getSessionList,
  getSessionPeople,
  legiscanKey,
  type LsBill,
  type LsPerson,
  type LsRollCall,
} from "./legiscan";
import { mapLimit } from "./fetchCache";
import { categorize } from "./parse";
import type {
  LegislativeVote,
  OfficialQuery,
  OfficialResolution,
  OfficialVote,
  VotingRecordProvider,
} from "./types";

/**
 * LegiScanProvider — primary ingestion provider for federal (state="US") and
 * all 50 state legislatures through one normalized API.
 *
 * Flow per official (every step cached in LegiScanService):
 *   getSessionList → current session
 *   getSessionPeople → resolve the official to a LegiScan people_id
 *   getMasterList → most recently acted-on bills
 *   getBill (bounded batch) → roll-call references + official state_link
 *   getRollCall → individual member positions
 *
 * Identity: legiscanId (preferred) → bioguide_id (federal) → name + chamber
 * (+ district number when the caller supplies one). Ambiguity is refused,
 * never guessed — the official is flagged for review instead.
 */

const PROVIDER_NAME = "LegiScan";

// vote_id is LegiScan's stable code; vote_text is preserved for audit.
const VOTE_ID_MAP: Record<number, OfficialVote> = {
  1: "Yea",
  2: "Nay",
  3: "Not Voting",
  4: "Not Voting", // "Absent" — normalized per spec; original kept in sourceVoteValue
};

function normalizeLast(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "Greene (GA)" → "Greene "
    .replace(/[^a-z\s'-]/g, "")
    .split(/\s+/)
    .filter((p) => p && !["jr", "sr", "ii", "iii", "iv"].includes(p));
  return parts[parts.length - 1] ?? "";
}
function firstInitial(name: string): string {
  return name.trim().charAt(0).toLowerCase();
}
/** "42nd Senate District" / "HD-058" / "District 58" → "58". */
function districtNumber(raw: string | undefined): string | undefined {
  const m = /(\d+)/.exec(raw ?? "");
  return m ? String(Number.parseInt(m[1], 10)) : undefined;
}

function wantedChamber(office: string | undefined): "H" | "S" | undefined {
  const o = (office ?? "").toLowerCase();
  if (o.includes("senat")) return "S";
  if (o.includes("represent") || o.includes("assembly") || o.includes("delegate") || o.includes("congress"))
    return "H";
  return undefined;
}
function personChamber(p: LsPerson): "H" | "S" | undefined {
  const role = (p.role ?? "").toLowerCase();
  if (role.startsWith("sen")) return "S";
  if (role.startsWith("rep") || role.startsWith("del") || role.startsWith("asm")) return "H";
  return undefined;
}

/** Exported for tests: identity resolution must be verifiable in isolation. */
export function resolvePerson(
  official: OfficialQuery,
  people: LsPerson[],
): { resolution: OfficialResolution; person?: LsPerson } {
  if (official.identifiers?.legiscanId) {
    const person = people.find((p) => p.people_id === official.identifiers!.legiscanId);
    return person
      ? { resolution: { matched: true, via: "legiscanId", memberKey: String(person.people_id) }, person }
      : { resolution: { matched: false, reason: "not-found" } };
  }
  if (official.identifiers?.bioguideId) {
    const person = people.find((p) => p.bioguide_id === official.identifiers!.bioguideId);
    if (person)
      return {
        resolution: { matched: true, via: "bioguideId", memberKey: String(person.people_id) },
        person,
      };
  }

  const last = normalizeLast(official.name);
  const chamber = wantedChamber(official.office);
  let candidates = people.filter((p) => {
    if (normalizeLast(p.last_name ?? p.name ?? "") !== last) return false;
    if (chamber && personChamber(p) && personChamber(p) !== chamber) return false;
    return true;
  });
  if (candidates.length > 1) {
    const init = firstInitial(official.name);
    const byInit = candidates.filter((p) => firstInitial(p.first_name ?? "") === init);
    if (byInit.length >= 1) candidates = byInit;
  }
  if (candidates.length > 1 && official.district) {
    const wanted = districtNumber(official.district);
    if (wanted) {
      const byDistrict = candidates.filter((p) => districtNumber(p.district) === wanted);
      if (byDistrict.length >= 1) candidates = byDistrict;
    }
  }
  if (candidates.length === 1) {
    return {
      resolution: {
        matched: true,
        via: official.district ? "name-chamber-district" : "name-state-unique",
        memberKey: String(candidates[0].people_id),
      },
      person: candidates[0],
    };
  }
  return {
    resolution: { matched: false, reason: candidates.length === 0 ? "not-found" : "ambiguous" },
  };
}

export const legiscanProvider: VotingRecordProvider = {
  providerId: "legiscan",

  supportsOfficial(o: OfficialQuery): boolean {
    if (!legiscanKey()) return false; // no key configured → fall through to official providers
    if (o.level === "local") return false; // LegiScan does not cover local bodies
    return wantedChamber(o.office) !== undefined;
  },

  async getVotes(official, { limit }) {
    const state = official.level === "federal" ? "US" : official.state.toUpperCase();

    // Current regular session (prior=0, special=0); newest year as fallback.
    const sessions = await getSessionList(state);
    const session =
      sessions.find((s) => s.prior === 0 && s.special === 0) ??
      [...sessions].sort((a, b) => (b.year_end ?? 0) - (a.year_end ?? 0))[0];
    if (!session) return { resolution: { matched: false, reason: "not-found" }, votes: [] };

    const people = await getSessionPeople(session.session_id);
    const { resolution, person } = resolvePerson(official, people);
    if (!resolution.matched || !person) return { resolution, votes: [] };
    const chamber = personChamber(person);

    // Discover roll calls: most recently acted-on bills → their vote refs.
    const masterList = await getMasterList(session.session_id);
    const recentBills = masterList
      .filter((b) => b.last_action_date)
      .sort((a, b) => (b.last_action_date ?? "").localeCompare(a.last_action_date ?? ""))
      .slice(0, Math.min(Math.max(Math.ceil(limit / 2), 20), 40));

    const bills = (
      await mapLimit(recentBills, 4, (entry) => getBill(entry.bill_id))
    ).filter((b): b is LsBill => b !== null);

    const rollCallRefs = bills
      .flatMap((bill) =>
        (bill.votes ?? [])
          .filter((v) => !chamber || !v.chamber || v.chamber === chamber)
          .map((v) => ({ bill, ref: v })),
      )
      .sort((a, b) => (b.ref.date ?? "").localeCompare(a.ref.date ?? ""))
      .slice(0, Math.min(limit + 10, 60));

    const rollCalls = (
      await mapLimit(rollCallRefs, 4, ({ ref }) => getRollCall(ref.roll_call_id))
    ).filter((r): r is LsRollCall => r !== null);
    const rollCallById = new Map(rollCalls.map((r) => [r.roll_call_id, r]));

    const retrievedAt = new Date().toISOString();
    const votes: LegislativeVote[] = [];
    const seen = new Set<number>(); // duplicate prevention across bills
    for (const { bill, ref } of rollCallRefs) {
      const rc = rollCallById.get(ref.roll_call_id);
      if (!rc || seen.has(rc.roll_call_id)) continue;
      seen.add(rc.roll_call_id);
      const mv = (rc.votes ?? []).find((v) => String(v.people_id) === resolution.memberKey);
      if (!mv) continue;
      const billNumber = bill.bill_number ?? bill.number;
      if (!rc.date) continue;
      votes.push({
        id: `legiscan-rc-${rc.roll_call_id}`,
        governmentLevel: official.level,
        jurisdiction: state,
        state: state === "US" ? undefined : state,
        chamber: rc.chamber === "S" ? "Senate" : rc.chamber === "H" ? "House" : rc.chamber,
        session: session.session_name,
        externalSessionId: String(session.session_id),
        rollCallId: String(rc.roll_call_id),
        externalBillId: String(bill.bill_id),
        billNumber,
        billTitle: bill.title,
        billDescription: bill.description !== bill.title ? bill.description : undefined,
        question: rc.desc,
        category: categorize(rc.desc, billNumber),
        voteDate: rc.date,
        officialVote: VOTE_ID_MAP[mv.vote_id] ?? "Other",
        sourceVoteValue: mv.vote_text,
        result: rc.passed === 1 ? "Passed" : rc.passed === 0 ? "Failed" : undefined,
        yeaCount: rc.yea,
        nayCount: rc.nay,
        absentCount: rc.absent,
        notVotingCount: rc.nv,
        totalVotes: rc.total,
        sourceProvider: PROVIDER_NAME,
        sourceRecordId: String(rc.roll_call_id),
        sourceUrl: ref.url ?? bill.url ?? "https://legiscan.com",
        officialGovernmentSourceUrl: ref.state_link ?? bill.state_link,
        retrievedAt,
        sourceUpdatedAt: bill.status_date,
      });
    }
    votes.sort((a, b) => b.voteDate.localeCompare(a.voteDate) || b.id.localeCompare(a.id));
    return { resolution, votes };
  },
};
