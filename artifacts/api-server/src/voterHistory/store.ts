import { readFileSync } from "node:fs";
import { getJurisdiction, isPublishable } from "./jurisdictions";
import { normalizeName, firstLast, isPublishableMatch } from "./matching";
import { FIXTURE_DATASET } from "./fixtureData";
import type {
  ElectionRef,
  ParticipationStatus,
  VoterHistoryDataset,
  VoterHistoryRecord,
} from "./types";

/**
 * Read-only store over the normalized voter-history dataset.
 *
 * The dataset is produced OFFLINE by the ingestion CLI
 * (scripts/src/voter-history/ingest-ga.mjs) and loaded at boot:
 *   - VOTER_HISTORY_DATASET=/path/to/dataset.json  → real, ingested data
 *   - VOTER_HISTORY_FIXTURES=true                  → fictitious demo dataset
 *   - neither                                      → feature reports no data
 *
 * Publication gates applied on every read:
 *   1. jurisdiction legal gate (jurisdictions.ts) — closed until counsel signs off
 *   2. identity-match gate — only MATCHED records are served; PROBABLE/AMBIGUOUS
 *      surface as MATCH_UNCERTAIN with no records
 * Fixture data bypasses gate 1 (it describes fictitious people) but is always
 * flagged `fixture: true` so clients must label it as sample data.
 */

/** Client-facing shape — a controlled representation, never raw voter-file rows. */
export interface VoterHistoryEntryView {
  electionDate: string;
  electionName: string;
  electionType: string;
  participated: boolean;
  votingMethod?: string;
  source: string;
  recordedAt: string; // provenance.retrievedAt (when we obtained the source data)
}

export interface VoterHistoryView {
  status: ParticipationStatus | "OK";
  jurisdiction: string;
  officialName: string;
  fixture: boolean;
  attribution: string;
  history: VoterHistoryEntryView[];
}

let dataset: VoterHistoryDataset | null = null;
let datasetError: string | null = null;

function loadDataset(): void {
  const path = process.env.VOTER_HISTORY_DATASET;
  if (path) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as VoterHistoryDataset;
      if (!Array.isArray(parsed.records) || !Array.isArray(parsed.elections)) {
        throw new Error("dataset missing records/elections arrays");
      }
      dataset = parsed;
      return;
    } catch (err) {
      datasetError = err instanceof Error ? err.message : String(err);
      dataset = null;
      return;
    }
  }
  if (process.env.VOTER_HISTORY_FIXTURES === "true") {
    dataset = FIXTURE_DATASET;
  }
}
loadDataset();

/** Test hook — not used by production code paths. */
export function _setDatasetForTests(next: VoterHistoryDataset | null): void {
  dataset = next;
  datasetError = null;
}

export function datasetLoadError(): string | null {
  return datasetError;
}

function electionById(ds: VoterHistoryDataset): Map<string, ElectionRef> {
  return new Map(ds.elections.map((e) => [e.id, e]));
}

function toView(
  rec: VoterHistoryRecord,
  election: ElectionRef,
  showVotingMethod: boolean,
): VoterHistoryEntryView {
  return {
    electionDate: election.electionDate,
    electionName: election.electionName,
    electionType: election.electionType,
    participated: rec.participated,
    ...(showVotingMethod && rec.votingMethod && rec.votingMethod !== "UNKNOWN"
      ? { votingMethod: rec.votingMethod }
      : {}),
    source: rec.provenance.sourceName,
    recordedAt: rec.provenance.retrievedAt,
  };
}

/**
 * Look up participation history for an official by display name + state.
 * Office is used as a tiebreaker when two registry entries share a name.
 */
export function getVoterHistory(params: {
  name: string;
  state: string;
  office?: string;
}): VoterHistoryView {
  const state = params.state.trim().toUpperCase();
  const cfg = getJurisdiction(state);
  const base: VoterHistoryView = {
    status: "DATA_NOT_AVAILABLE",
    jurisdiction: state,
    officialName: params.name,
    fixture: dataset?.fixture ?? false,
    attribution: cfg.attributionRequired,
    history: [],
  };

  if (!dataset) return base;

  // Legal gate: real data requires an open jurisdiction gate. Fixtures are
  // fictitious and exempt, but stay clearly flagged.
  if (!dataset.fixture && !isPublishable(cfg)) {
    return { ...base, status: "DATA_NOT_PUBLIC" };
  }

  const wanted = firstLast(normalizeName(params.name));
  let matches = dataset.officials.filter(
    (o) => o.state === state && firstLast(o.normalizedName) === wanted,
  );
  if (matches.length > 1 && params.office) {
    const byOffice = matches.filter(
      (o) => o.office.toLowerCase() === params.office!.toLowerCase(),
    );
    if (byOffice.length >= 1) matches = byOffice;
  }
  if (matches.length === 0) return base;
  if (matches.length > 1) return { ...base, status: "MATCH_UNCERTAIN" };

  const official = matches[0];
  const records = dataset.records.filter((r) => r.officialKey === official.key);
  if (records.length === 0) return base;

  // Identity-match gate: anything below MATCHED is withheld.
  const published = records.filter((r) => isPublishableMatch(r.matchConfidence));
  if (published.length === 0) {
    return { ...base, officialName: official.displayName, status: "MATCH_UNCERTAIN" };
  }

  const elections = electionById(dataset);
  const history = published
    .map((r) => {
      const election = elections.get(r.electionId);
      return election ? toView(r, election, cfg.showVotingMethod || dataset!.fixture) : null;
    })
    .filter((v): v is VoterHistoryEntryView => v !== null)
    .sort((a, b) => b.electionDate.localeCompare(a.electionDate));

  return {
    ...base,
    officialName: official.displayName,
    status: "OK",
    history,
  };
}
