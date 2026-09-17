import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  firstLast,
  matchOfficial,
  type VoterFileCandidate,
} from "../src/voterHistory/matching";
import { getVoterHistory, _setDatasetForTests } from "../src/voterHistory/store";
import { FIXTURE_DATASET } from "../src/voterHistory/fixtureData";
import { getJurisdiction, isPublishable } from "../src/voterHistory/jurisdictions";
import type { OfficialRegistryEntry } from "../src/voterHistory/types";

const official = (over: Partial<OfficialRegistryEntry> = {}): OfficialRegistryEntry => ({
  key: "ga:jordan-sample:state-senator",
  displayName: "Jordan Sample",
  normalizedName: "jordan sample",
  state: "GA",
  office: "State Senator",
  level: "state",
  match: {},
  ...over,
});

test("normalizeName strips suffixes, punctuation, diacritics", () => {
  assert.equal(normalizeName("Brian P. Kemp, Jr."), "brian p kemp");
  assert.equal(normalizeName("José O'Neil-Smith III"), "jose oneilsmith");
  assert.equal(firstLast("brian p kemp"), "brian kemp");
});

test("matchOfficial: unique name + birth year → MATCHED", () => {
  const cands: VoterFileCandidate[] = [
    { normalizedName: "jordan sample", birthYear: 1970, county: "Fulton", recordId: "a" },
  ];
  const r = matchOfficial(official({ match: { birthYear: 1970 } }), cands);
  assert.equal(r.confidence, "MATCHED");
});

test("matchOfficial: unique name without corroboration → PROBABLE_MATCH (not published)", () => {
  const cands: VoterFileCandidate[] = [
    { normalizedName: "jordan sample", recordId: "a" },
  ];
  const r = matchOfficial(official(), cands);
  assert.equal(r.confidence, "PROBABLE_MATCH");
});

test("matchOfficial: multiple candidates, one birth-year hit → MATCHED", () => {
  const cands: VoterFileCandidate[] = [
    { normalizedName: "jordan sample", birthYear: 1970, recordId: "a" },
    { normalizedName: "jordan sample", birthYear: 1955, recordId: "b" },
  ];
  const r = matchOfficial(official({ match: { birthYear: 1970 } }), cands);
  assert.equal(r.confidence, "MATCHED");
  assert.equal(r.candidate?.recordId, "a");
});

test("matchOfficial: multiple candidates without disambiguation → AMBIGUOUS", () => {
  const cands: VoterFileCandidate[] = [
    { normalizedName: "jordan sample", birthYear: 1970, recordId: "a" },
    { normalizedName: "jordan sample", birthYear: 1970, recordId: "b" },
  ];
  const r = matchOfficial(official({ match: { birthYear: 1970 } }), cands);
  assert.equal(r.confidence, "AMBIGUOUS");
});

test("matchOfficial: no candidates → NO_MATCH", () => {
  const r = matchOfficial(official(), []);
  assert.equal(r.confidence, "NO_MATCH");
});

test("store: fixture MATCHED official returns history, newest first", () => {
  _setDatasetForTests(FIXTURE_DATASET);
  const view = getVoterHistory({ name: "Jordan Sample", state: "GA" });
  assert.equal(view.status, "OK");
  assert.equal(view.fixture, true);
  assert.equal(view.history.length, 2);
  assert.ok(view.history[0].electionDate > view.history[1].electionDate);
  assert.equal(view.history[0].participated, true);
});

test("store: PROBABLE_MATCH-only official is withheld as MATCH_UNCERTAIN", () => {
  _setDatasetForTests(FIXTURE_DATASET);
  const view = getVoterHistory({ name: "Taylor Example", state: "GA" });
  assert.equal(view.status, "MATCH_UNCERTAIN");
  assert.equal(view.history.length, 0);
});

test("store: unknown official → DATA_NOT_AVAILABLE (never 'did not vote')", () => {
  _setDatasetForTests(FIXTURE_DATASET);
  const view = getVoterHistory({ name: "Nobody Here", state: "GA" });
  assert.equal(view.status, "DATA_NOT_AVAILABLE");
  assert.equal(view.history.length, 0);
});

test("store: REAL (non-fixture) data is blocked while the GA legal gate is closed", () => {
  _setDatasetForTests({ ...FIXTURE_DATASET, fixture: false });
  const view = getVoterHistory({ name: "Jordan Sample", state: "GA" });
  assert.equal(view.status, "DATA_NOT_PUBLIC");
  assert.equal(view.history.length, 0);
});

test("jurisdictions: GA gate is closed until counsel sign-off; unknown states have no coverage", () => {
  const ga = getJurisdiction("ga");
  assert.equal(ga.voterHistoryAvailable, true);
  assert.equal(isPublishable(ga), false); // must stay false until legal review
  const wy = getJurisdiction("WY");
  assert.equal(wy.voterHistoryAvailable, false);
  assert.equal(isPublishable(wy), false);
});

test("client view never leaks matching PII or raw identifiers", () => {
  _setDatasetForTests(FIXTURE_DATASET);
  const view = getVoterHistory({ name: "Jordan Sample", state: "GA" });
  const serialized = JSON.stringify(view);
  assert.ok(!serialized.includes("birthYear"));
  assert.ok(!serialized.includes("registrationCounty"));
  assert.ok(!serialized.includes("regNumber"));
  assert.ok(!serialized.includes("sourceRecordId"));
});
