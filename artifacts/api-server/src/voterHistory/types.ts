/**
 * Elected Official Voter History — domain types.
 *
 * CRITICAL DOMAIN RULE: "voter history" means *participation* in an election
 * (did the person cast a ballot), never ballot choice. U.S. ballots are
 * secret. Nothing in this module may model, store, or imply whom anyone
 * voted for. Primary-party fields describe which primary a voter chose to
 * participate in (public record in open-primary states), not candidate choice.
 */

/** Confidence that a voter-file record refers to the same person as the official. */
export type MatchConfidence =
  | "MATCHED"
  | "PROBABLE_MATCH"
  | "AMBIGUOUS"
  | "NO_MATCH";

/**
 * Participation statuses surfaced to clients. Missing data is NEVER collapsed
 * into "did not vote":
 *  - PARTICIPATED             — an authoritative record of participation exists
 *  - NO_PARTICIPATION_RECORDED— the source covers this election and has no
 *                               record for this person (still not proof of
 *                               "did not vote": registration elsewhere, name
 *                               changes, etc.)
 *  - DATA_NOT_AVAILABLE       — we have no source coverage for this election
 *  - DATA_NOT_PUBLIC          — jurisdiction/license does not permit display
 *  - MATCH_UNCERTAIN          — identity match below publication threshold
 */
export type ParticipationStatus =
  | "PARTICIPATED"
  | "NO_PARTICIPATION_RECORDED"
  | "DATA_NOT_AVAILABLE"
  | "DATA_NOT_PUBLIC"
  | "MATCH_UNCERTAIN";

export type ElectionType =
  | "GENERAL"
  | "PRIMARY"
  | "SPECIAL"
  | "RUNOFF"
  | "MUNICIPAL"
  | "OTHER";

/**
 * How the ballot was cast, where the source provides it. Granularity varies by
 * state: Georgia's history file has a single absentee flag covering both mail
 * and advance in-person voting, hence ABSENTEE_OR_EARLY.
 */
export type VotingMethod =
  | "IN_PERSON"
  | "EARLY"
  | "ABSENTEE_BY_MAIL"
  | "ABSENTEE_OR_EARLY"
  | "PROVISIONAL"
  | "UNKNOWN";

/** Normalized election (deduplicated across voter-history records). */
export interface ElectionRef {
  id: string; // e.g. "ga-2024-11-05-general"
  jurisdiction: string; // 2-letter state code
  electionDate: string; // ISO yyyy-mm-dd
  electionName: string;
  electionType: ElectionType;
  source: string;
}

/** Provenance carried by every normalized record (§ auditability). */
export interface Provenance {
  sourceName: string; // e.g. "Georgia Secretary of State — Voter History File"
  sourceUrl: string;
  sourceRecordId: string; // registration number is NOT exposed; this is an opaque hash
  sourceFile: string; // file name/version the record came from
  sourceUpdatedAt: string | null; // as reported by the source, when known
  retrievedAt: string; // when the raw file was obtained
  processedAt: string; // when normalization ran
}

/** One participation event for one official. */
export interface VoterHistoryRecord {
  officialKey: string; // stable key into the official registry
  electionId: string;
  participated: true; // presence of a record means participation was recorded
  votingMethod?: VotingMethod;
  /**
   * Open-primary states record which party's primary ballot was requested.
   * This is a public-record fact about primary participation, NOT candidate
   * choice, and is only shown when the jurisdiction config allows it.
   */
  primaryBallotParty?: string;
  matchConfidence: MatchConfidence;
  provenance: Provenance;
}

/**
 * Registry entry linking an app-visible official to voter-file identity.
 * PII used for matching (birth year, registration county) stays server-side
 * and is never sent to clients.
 */
export interface OfficialRegistryEntry {
  key: string; // e.g. "ga:brian-kemp:governor"
  displayName: string;
  normalizedName: string; // lowercased "first last" without punctuation/suffixes
  state: string;
  office: string;
  level: "federal" | "state" | "county" | "city";
  /** Matching attributes — server-side only. */
  match: {
    birthYear?: number;
    registrationCounty?: string;
    suffix?: string;
    middleName?: string;
  };
}

/** Per-state configuration: source + legal gating. Never hard-code national assumptions. */
export interface JurisdictionConfig {
  state: string;
  voterHistoryAvailable: boolean;
  sourceType: "STATE_FILE" | "STATE_API" | "LICENSED_PROVIDER" | "NONE";
  sourceName: string;
  sourceUrl: string;
  apiAvailable: boolean;
  fileAvailable: boolean;
  historicalDepth: string;
  updateFrequency: string;
  /** Legal gates — ALL must be true before records are served to clients. */
  permittedUseConfirmed: boolean; // counsel confirmed our use fits the permitted-use terms
  commercialUseAllowed: boolean;
  publicDisplayAllowed: boolean;
  redistributionAllowed: boolean;
  showPrimaryBallotParty: boolean;
  showVotingMethod: boolean;
  retentionRequirements: string;
  attributionRequired: string; // attribution string to display, "" if none
  notes: string;
}

/** Common interface every state adapter implements (§ scalability). */
export interface VoterHistoryProvider {
  jurisdiction: string;
  fetchElections(): Promise<ElectionRef[]>;
  fetchVoterHistory(officials: OfficialRegistryEntry[]): Promise<VoterHistoryRecord[]>;
}

/** The normalized dataset the API serves (produced offline by the ingestion CLI). */
export interface VoterHistoryDataset {
  generatedAt: string;
  generator: string; // ingestion tool + version
  fixture: boolean; // true = demo/dev data, must never be presented as real
  elections: ElectionRef[];
  officials: OfficialRegistryEntry[];
  records: VoterHistoryRecord[];
}
