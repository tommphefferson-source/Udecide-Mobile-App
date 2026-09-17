/**
 * Voting Records — client for the api-server's /officials/voting-record
 * endpoint (legislators' recorded roll-call votes).
 *
 * The app never talks to LegiScan or government APIs directly — all provider
 * keys and logic live server-side. This client renders exactly what the
 * server sends: official facts (what was voted on → how the official voted →
 * what happened → source) with no scores, rankings, or judgments.
 */
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export type VoteCategory =
  | "bill"
  | "amendment"
  | "resolution"
  | "nomination"
  | "procedural"
  | "other";

export interface LegislativeVote {
  id: string;
  governmentLevel: "federal" | "state" | "local";
  jurisdiction: string;
  state?: string;
  chamber?: string;
  session?: string;
  voteNumber?: string;
  billNumber?: string;
  billTitle?: string;
  billDescription?: string;
  question?: string;
  category: VoteCategory;
  voteDate: string;
  officialVote: "Yea" | "Nay" | "Present" | "Not Voting" | "Abstain" | "Other";
  result?: string;
  yeaCount?: number;
  nayCount?: number;
  presentCount?: number;
  absentCount?: number;
  notVotingCount?: number;
  totalVotes?: number;
  sourceProvider: string;
  sourceUrl: string;
  officialGovernmentSourceUrl?: string;
  retrievedAt: string;
}

export type VotingRecordStatus =
  | "OK"
  | "JURISDICTION_UNSUPPORTED"
  | "OFFICIAL_NOT_MATCHED"
  | "MATCH_AMBIGUOUS"
  | "NO_VOTES_FOUND"
  | "SOURCE_UNAVAILABLE";

export interface VotingRecordPage {
  status: VotingRecordStatus;
  officialName: string;
  votes: LegislativeVote[];
  page: number;
  hasMore: boolean;
}

export interface VotingRecordQuery {
  name: string;
  state: string;
  level: string;
  office?: string;
  district?: string;
  page?: number;
  category?: VoteCategory | "all";
  search?: string;
}

export async function getVotingRecord(
  query: VotingRecordQuery,
): Promise<VotingRecordPage | null> {
  const qs = new URLSearchParams({
    name: query.name,
    state: query.state,
    level: query.level,
    page: String(query.page ?? 1),
  });
  if (query.office) qs.set("office", query.office);
  if (query.district) qs.set("district", query.district);
  if (query.category && query.category !== "all") qs.set("category", query.category);
  if (query.search) qs.set("q", query.search);
  try {
    const res = await fetch(`${API_BASE}/officials/voting-record?${qs.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as VotingRecordPage;
  } catch {
    return null;
  }
}

/** Whether the official plausibly has legislative roll-call votes at all. */
export function officeHasVotingRecord(office: string, level: string): boolean {
  if (level !== "federal" && level !== "state") return false;
  return /senat|represent|assembly|delegate|congress/i.test(office);
}
