/**
 * Elected Official Voting Records — legislators' recorded roll-call votes
 * (what was voted on → how the official voted → what happened → source).
 *
 * NEUTRALITY: this module reports official facts only. No scores, rankings,
 * good/bad classifications, ideology labels, or motive inference — anywhere,
 * ever. Descriptions come from official sources verbatim; nothing is
 * AI-rewritten.
 *
 * Not to be confused with voter participation history ("did a citizen cast a
 * ballot") — that is a separate feature with separate legal constraints.
 */

export type GovernmentLevel = "federal" | "state" | "local";

export type OfficialVote =
  | "Yea"
  | "Nay"
  | "Present"
  | "Not Voting"
  | "Abstain"
  | "Other";

/** Broad, source-faithful classification used only for UI filtering. */
export type VoteCategory =
  | "bill"
  | "amendment"
  | "resolution"
  | "nomination"
  | "procedural"
  | "other";

/** Provider-independent normalized vote. Optional fields stay absent when a
 * jurisdiction's source does not supply them — never forced or invented. */
export interface LegislativeVote {
  id: string; // e.g. "legiscan-rc-123456" / "us-house-119-2-250"
  governmentLevel: GovernmentLevel;
  jurisdiction: string; // "US" for Congress; state code for legislatures
  state?: string;
  chamber?: string; // "House" | "Senate" | state chamber name
  congress?: number;
  session?: string; // human-readable session name
  externalSessionId?: string;
  voteNumber?: string;
  rollCallId?: string; // provider roll-call id
  externalBillId?: string; // provider bill id
  billNumber?: string; // "H.R. 4541" / "HB 123"
  billTitle?: string; // official title, verbatim from the source
  billDescription?: string; // official description, verbatim — never AI-rewritten
  /** The official vote question/motion ("On Passage", "On Cloture…").
   * Critical: not every roll call is final passage. */
  question?: string;
  category: VoteCategory;
  voteDate: string; // ISO yyyy-mm-dd
  officialVote: OfficialVote;
  /** Original provider vote value, preserved for auditing ("Y", "Absent", …). */
  sourceVoteValue?: string;
  result?: string; // official result text ("Passed", "Agreed to", …)
  yeaCount?: number;
  nayCount?: number;
  presentCount?: number;
  absentCount?: number;
  notVotingCount?: number;
  totalVotes?: number;
  // Provenance — every displayed fact traces to its source.
  sourceProvider: string; // "LegiScan" / "U.S. House of Representatives — Office of the Clerk"
  sourceRecordId?: string; // provider record id for audit/reimport
  sourceUrl: string; // human-viewable provider page for THIS vote
  /** Link to the underlying official government record when available
   * (state legislature site, clerk.house.gov, senate.gov). */
  officialGovernmentSourceUrl?: string;
  retrievedAt: string; // ISO timestamp we fetched it
  sourceUpdatedAt?: string;
}

/** Stable external identifiers for matching officials to vote records.
 * Prefer these over names whenever available. */
export interface OfficialIdentifiers {
  /** Primary external identifier when using LegiScan. */
  legiscanId?: number;
  bioguideId?: string;
  openStatesId?: string;
  externalIds?: Record<string, string>;
}

/** How the service identified the official within the vote data. */
export type OfficialResolution =
  | {
      matched: true;
      via: "legiscanId" | "bioguideId" | "name-state-unique" | "name-chamber-district";
      memberKey: string;
    }
  | { matched: false; reason: "ambiguous" | "not-found" };

export interface OfficialQuery {
  name: string;
  state: string; // 2-letter
  level: GovernmentLevel;
  office?: string;
  district?: string; // e.g. "42nd Senate District" — aids identity resolution
  identifiers?: OfficialIdentifiers;
}

/** Common interface every provider implements. The UI never knows which
 * provider supplied the data — it talks to the service only. */
export interface VotingRecordProvider {
  readonly providerId: string;
  supportsOfficial(official: OfficialQuery): boolean;
  /** Most-recent-first votes for the official. `limit` bounds source fetches. */
  getVotes(official: OfficialQuery, options: { limit: number }): Promise<{
    resolution: OfficialResolution;
    votes: LegislativeVote[];
  }>;
}
