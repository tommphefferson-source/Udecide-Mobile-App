import { legiscanProvider } from "./legiscanProvider";
import { houseProvider } from "./houseProvider";
import { senateProvider } from "./senateProvider";
import type {
  LegislativeVote,
  OfficialQuery,
  VoteCategory,
  VotingRecordProvider,
} from "./types";

/**
 * VotingRecordService — the only entry point the API route (and therefore the
 * mobile UI) talks to. Providers are interchangeable behind it; adding
 * another provider (Open States, a local government) means implementing
 * VotingRecordProvider and appending it here — no UI changes.
 *
 * Provider order (first supporting provider wins):
 *   1. LegiScanProvider — PRIMARY ingestion source: federal + all 50 state
 *      legislatures through one normalized API. Active when
 *      LEGISCAN_API_KEY is configured server-side.
 *   2. House Clerk / Senate LIS — official, keyless federal sources. They
 *      keep federal records working with no key, and serve as the official
 *      fallback/verification path.
 * Local governments are designed-for but not yet implemented; they surface
 * as JURISDICTION_UNSUPPORTED, which the app renders as a friendly
 * "records not available" state.
 */

const PROVIDERS: VotingRecordProvider[] = [legiscanProvider, houseProvider, senateProvider];

export type VotingRecordStatus =
  | "OK"
  | "JURISDICTION_UNSUPPORTED" // no provider covers this official's level/office
  | "OFFICIAL_NOT_MATCHED" // provider data has no such member
  | "MATCH_AMBIGUOUS" // more than one member could be this official — never guess
  | "NO_VOTES_FOUND"
  | "SOURCE_UNAVAILABLE"; // upstream government service failed

export interface VotingRecordFilters {
  category?: VoteCategory | "all";
  search?: string;
  from?: string; // ISO date inclusive
  to?: string; // ISO date inclusive
}

export interface VotingRecordPage {
  status: VotingRecordStatus;
  officialName: string;
  votes: LegislativeVote[];
  page: number;
  hasMore: boolean;
}

export const PAGE_SIZE = 20;

function applyFilters(votes: LegislativeVote[], f: VotingRecordFilters): LegislativeVote[] {
  let out = votes;
  if (f.category && f.category !== "all") out = out.filter((v) => v.category === f.category);
  if (f.from) out = out.filter((v) => v.voteDate >= f.from!);
  if (f.to) out = out.filter((v) => v.voteDate <= f.to!);
  if (f.search) {
    const q = f.search.toLowerCase();
    out = out.filter(
      (v) =>
        (v.billNumber ?? "").toLowerCase().includes(q) ||
        (v.billTitle ?? "").toLowerCase().includes(q) ||
        (v.question ?? "").toLowerCase().includes(q),
    );
  }
  return out;
}

export function getVotingRecord(
  official: OfficialQuery,
  page: number,
  filters: VotingRecordFilters,
): Promise<VotingRecordPage> {
  return getVotingRecordWith(PROVIDERS, official, page, filters);
}

/** Provider-injectable core (tests exercise it with fake providers). */
export async function getVotingRecordWith(
  providers: VotingRecordProvider[],
  official: OfficialQuery,
  page: number,
  filters: VotingRecordFilters,
): Promise<VotingRecordPage> {
  const base: VotingRecordPage = {
    status: "JURISDICTION_UNSUPPORTED",
    officialName: official.name,
    votes: [],
    page,
    hasMore: false,
  };

  const provider = providers.find((p) => p.supportsOfficial(official));
  if (!provider) return base;

  // Fetch a window large enough for the requested page (+1 item to detect
  // hasMore) — the provider bounds how many source documents it will scan.
  const needed = page * PAGE_SIZE + 1;
  // Filters discard votes after fetching, so widen the scan when filtering.
  const isFiltered =
    (filters.category && filters.category !== "all") ||
    !!filters.search ||
    !!filters.from ||
    !!filters.to;
  const fetchLimit = Math.min(isFiltered ? needed * 4 : needed, 150);

  let result;
  try {
    result = await provider.getVotes(official, { limit: fetchLimit });
  } catch {
    return { ...base, status: "SOURCE_UNAVAILABLE" };
  }

  if (!result.resolution.matched) {
    return {
      ...base,
      status:
        result.resolution.reason === "ambiguous" ? "MATCH_AMBIGUOUS" : "OFFICIAL_NOT_MATCHED",
    };
  }

  const filtered = applyFilters(result.votes, filters);
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  if (slice.length === 0 && page === 1) {
    return { ...base, status: "NO_VOTES_FOUND" };
  }
  return {
    status: "OK",
    officialName: official.name,
    votes: slice,
    page,
    hasMore: filtered.length > start + PAGE_SIZE || result.votes.length >= fetchLimit,
  };
}
