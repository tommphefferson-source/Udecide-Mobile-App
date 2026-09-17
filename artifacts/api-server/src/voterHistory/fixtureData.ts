import type { VoterHistoryDataset } from "./types";

/**
 * Development/demo fixtures.
 *
 * IMPORTANT: every person in this file is FICTITIOUS. Voter-history facts may
 * never be fabricated for real people — not in demos, not with a "sample"
 * label. These rows exist so the API shape, matching logic, and mobile UI can
 * be exercised end-to-end before a real, legally-cleared dataset exists.
 * `fixture: true` is carried through the API so clients label it sample data.
 *
 * The record layout mirrors what the Georgia ingestion CLI emits
 * (scripts/src/voter-history/ingest-ga.mjs).
 */
export const FIXTURE_DATASET: VoterHistoryDataset = {
  generatedAt: "2026-09-01T00:00:00.000Z",
  generator: "fixture (hand-written, fictitious people)",
  fixture: true,
  elections: [
    {
      id: "ga-2024-11-05-general",
      jurisdiction: "GA",
      electionDate: "2024-11-05",
      electionName: "2024 General Election",
      electionType: "GENERAL",
      source: "Fixture",
    },
    {
      id: "ga-2024-05-21-primary",
      jurisdiction: "GA",
      electionDate: "2024-05-21",
      electionName: "2024 General Primary",
      electionType: "PRIMARY",
      source: "Fixture",
    },
    {
      id: "ga-2022-11-08-general",
      jurisdiction: "GA",
      electionDate: "2022-11-08",
      electionName: "2022 General Election",
      electionType: "GENERAL",
      source: "Fixture",
    },
  ],
  officials: [
    {
      key: "ga:jordan-sample:state-senator",
      displayName: "Jordan Sample",
      normalizedName: "jordan sample",
      state: "GA",
      office: "State Senator",
      level: "state",
      match: { birthYear: 1970, registrationCounty: "Fulton" },
    },
    {
      key: "ga:taylor-example:mayor",
      displayName: "Taylor Example",
      normalizedName: "taylor example",
      state: "GA",
      office: "Mayor",
      level: "city",
      match: { birthYear: 1985, registrationCounty: "DeKalb" },
    },
  ],
  records: [
    {
      officialKey: "ga:jordan-sample:state-senator",
      electionId: "ga-2024-11-05-general",
      participated: true,
      votingMethod: "EARLY",
      matchConfidence: "MATCHED",
      provenance: {
        sourceName: "Fixture (fictitious)",
        sourceUrl: "",
        sourceRecordId: "fixture-0001",
        sourceFile: "fixture",
        sourceUpdatedAt: null,
        retrievedAt: "2026-09-01T00:00:00.000Z",
        processedAt: "2026-09-01T00:00:00.000Z",
      },
    },
    {
      officialKey: "ga:jordan-sample:state-senator",
      electionId: "ga-2022-11-08-general",
      participated: true,
      votingMethod: "IN_PERSON",
      matchConfidence: "MATCHED",
      provenance: {
        sourceName: "Fixture (fictitious)",
        sourceUrl: "",
        sourceRecordId: "fixture-0002",
        sourceFile: "fixture",
        sourceUpdatedAt: null,
        retrievedAt: "2026-09-01T00:00:00.000Z",
        processedAt: "2026-09-01T00:00:00.000Z",
      },
    },
    // Taylor Example: only a PROBABLE_MATCH — exercises the "not published,
    // MATCH_UNCERTAIN" path end-to-end.
    {
      officialKey: "ga:taylor-example:mayor",
      electionId: "ga-2024-11-05-general",
      participated: true,
      votingMethod: "ABSENTEE_BY_MAIL",
      matchConfidence: "PROBABLE_MATCH",
      provenance: {
        sourceName: "Fixture (fictitious)",
        sourceUrl: "",
        sourceRecordId: "fixture-0003",
        sourceFile: "fixture",
        sourceUpdatedAt: null,
        retrievedAt: "2026-09-01T00:00:00.000Z",
        processedAt: "2026-09-01T00:00:00.000Z",
      },
    },
  ],
};
