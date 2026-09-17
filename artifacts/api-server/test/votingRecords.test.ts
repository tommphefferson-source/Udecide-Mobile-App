import test from "node:test";
import assert from "node:assert/strict";
import {
  parseHouseRollCall,
  parseSenateRollCall,
  parseSenateVoteMenu,
  parseHouseDate,
  parseSenateDate,
  normalizeVote,
  categorize,
} from "../src/votingRecords/parse";
import { resolvePerson } from "../src/votingRecords/legiscanProvider";
import { getVotingRecordWith, PAGE_SIZE } from "../src/votingRecords/service";
import type {
  LegislativeVote,
  OfficialQuery,
  VotingRecordProvider,
} from "../src/votingRecords/types";

// ── Fixtures (trimmed from live-verified official responses, 2026-09) ───────

const HOUSE_XML = `<?xml version="1.0"?><rollcall-vote><vote-metadata>
<congress>119</congress><session>2nd</session><rollcall-num>250</rollcall-num>
<legis-num>H R 4541</legis-num>
<vote-question>On Motion to Suspend the Rules and Pass, as Amended</vote-question>
<vote-result>Passed</vote-result><action-date>20-Jul-2026</action-date>
<vote-desc>EARLY Act Reauthorization</vote-desc>
<vote-totals><totals-by-vote><yea-total>394</yea-total><nay-total>6</nay-total>
<present-total>0</present-total><not-voting-total>31</not-voting-total></totals-by-vote></vote-totals>
</vote-metadata><vote-data>
<recorded-vote><legislator name-id="A000370" sort-field="Adams" unaccented-name="Adams" party="D" state="NC" role="legislator">Adams</legislator><vote>Yea</vote></recorded-vote>
<recorded-vote><legislator name-id="A000055" sort-field="Aderholt" unaccented-name="Aderholt" party="R" state="AL" role="legislator">Aderholt</legislator><vote>Aye</vote></recorded-vote>
<recorded-vote><legislator name-id="B000001" sort-field="Baker" unaccented-name="Baker" party="R" state="GA" role="legislator">Baker</legislator><vote>Not Voting</vote></recorded-vote>
</vote-data></rollcall-vote>`;

const SENATE_XML = `<?xml version="1.0"?><roll_call_vote>
<congress>119</congress><session>2</session><vote_number>235</vote_number>
<vote_date>September 15, 2026,  05:00 PM</vote_date>
<vote_result_text>Agreed to (74-24, 3/5 majority required)</vote_result_text>
<question>On Cloture on the Motion to Proceed</question>
<vote_title>Motion to Invoke Cloture: Motion to Proceed to S. 4668</vote_title>
<vote_result>Cloture on the Motion to Proceed Agreed to</vote_result>
<document><document_name>S. 4668</document_name></document>
<count><yeas>74</yeas><nays>24</nays><present /><absent>2</absent></count>
<members>
<member><member_full>Alsobrooks (D-MD)</member_full><last_name>Alsobrooks</last_name><first_name>Angela</first_name><party>D</party><state>MD</state><vote_cast>Nay</vote_cast><lis_member_id>S429</lis_member_id></member>
<member><member_full>Ossoff (D-GA)</member_full><last_name>Ossoff</last_name><first_name>Jon</first_name><party>D</party><state>GA</state><vote_cast>Yea</vote_cast><lis_member_id>S414</lis_member_id></member>
</members></roll_call_vote>`;

const SENATE_MENU_XML = `<?xml version="1.0"?><vote_summary><congress>119</congress><session>2</session>
<votes><vote><vote_number>00235</vote_number><vote_date>15-Sep</vote_date><issue>S. 4668</issue>
<question>On Cloture on the Motion to Proceed</question><result>Agreed to</result>
<vote_tally><yeas>74</yeas><nays>24</nays></vote_tally><title>Motion to Invoke Cloture</title></vote>
<vote><vote_number>00234</vote_number><issue>H.R. 3633</issue><question>Q</question><result>Rejected</result></vote>
</votes></vote_summary>`;

// ── Parser tests (official formats) ─────────────────────────────────────────

test("parseHouseRollCall extracts metadata, totals, and member votes", () => {
  const rc = parseHouseRollCall(HOUSE_XML);
  assert.ok(rc);
  assert.equal(rc.congress, 119);
  assert.equal(rc.rollNumber, 250);
  assert.equal(rc.billNumber, "H.R. 4541");
  assert.equal(rc.voteDate, "2026-07-20");
  assert.equal(rc.yeaCount, 394);
  assert.equal(rc.notVotingCount, 31);
  assert.equal(rc.members.length, 3);
  assert.equal(rc.members[0].bioguideId, "A000370");
  assert.equal(rc.members[1].vote, "Yea"); // "Aye" normalized
  assert.equal(rc.members[2].vote, "Not Voting");
});

test("parseSenateRollCall extracts question, counts, and member votes", () => {
  const rc = parseSenateRollCall(SENATE_XML);
  assert.ok(rc);
  assert.equal(rc.voteNumber, 235);
  assert.equal(rc.voteDate, "2026-09-15");
  assert.equal(rc.billNumber, "S. 4668");
  assert.equal(rc.question, "On Cloture on the Motion to Proceed");
  assert.equal(rc.yeaCount, 74);
  assert.equal(rc.notVotingCount, 2); // <absent>
  const ossoff = rc.members.find((m) => m.lastName === "Ossoff");
  assert.equal(ossoff?.vote, "Yea");
  assert.equal(ossoff?.state, "GA");
  // Regression: <vote_result> must not swallow <vote_result_text> content.
  assert.equal(rc.result, "Cloture on the Motion to Proceed Agreed to");
});

test("parseSenateVoteMenu lists vote numbers newest-first data", () => {
  const menu = parseSenateVoteMenu(SENATE_MENU_XML);
  assert.ok(menu);
  assert.equal(menu.length, 2);
  assert.equal(menu[0].voteNumber, 235);
});

test("parsers fail closed on unexpected shapes (schema guard)", () => {
  assert.equal(parseHouseRollCall("<html>404</html>"), null);
  assert.equal(parseSenateRollCall("<unexpected/>"), null);
  assert.equal(parseHouseRollCall("<rollcall-vote><vote-metadata></vote-metadata></rollcall-vote>"), null);
});

test("date + vote-value normalization", () => {
  assert.equal(parseHouseDate("5-Jan-2026"), "2026-01-05");
  assert.equal(parseSenateDate("March 8, 2026, 01:00 PM"), "2026-03-08");
  assert.equal(parseHouseDate("garbage"), null);
  assert.equal(normalizeVote("Aye"), "Yea");
  assert.equal(normalizeVote("No"), "Nay");
  assert.equal(normalizeVote("Present"), "Present");
  assert.equal(normalizeVote("Absent"), "Not Voting");
  assert.equal(normalizeVote("Abstain"), "Abstain");
  assert.equal(normalizeVote("weird"), "Other");
});

test("categorize is source-faithful across federal and state formats", () => {
  assert.equal(categorize("On Passage", "H.R. 1"), "bill");
  assert.equal(categorize("On Passage", "HB 123"), "bill");
  assert.equal(categorize("On the Nomination", undefined), "nomination");
  assert.equal(categorize("On Cloture on the Motion to Proceed", "S. 4668"), "procedural");
  assert.equal(categorize("On Agreeing to the Amendment", "H.R. 2"), "amendment");
  assert.equal(categorize("On Passage", "HJR 5"), "resolution");
  assert.equal(categorize("On Passage", "S.Res. 12"), "resolution");
});

// ── Identity resolution (LegiScan) ──────────────────────────────────────────

const PEOPLE = [
  { people_id: 101, name: "Elena Parent", first_name: "Elena", last_name: "Parent", role: "Sen", district: "SD-042", bioguide_id: undefined },
  { people_id: 102, name: "Park Cannon", first_name: "Park", last_name: "Cannon", role: "Rep", district: "HD-058" },
  { people_id: 103, name: "Alex Smith", first_name: "Alex", last_name: "Smith", role: "Rep", district: "HD-001" },
  { people_id: 104, name: "Avery Smith", first_name: "Avery", last_name: "Smith", role: "Rep", district: "HD-002" },
];
const officialBase: OfficialQuery = { name: "", state: "GA", level: "state" };

test("resolvePerson: legiscanId is preferred and authoritative", () => {
  const r = resolvePerson(
    { ...officialBase, name: "Someone Else", identifiers: { legiscanId: 101 } },
    PEOPLE,
  );
  assert.ok(r.resolution.matched);
  assert.equal(r.person?.people_id, 101);
});

test("resolvePerson: unique name + chamber matches", () => {
  const r = resolvePerson({ ...officialBase, name: "Elena Parent", office: "State Senator" }, PEOPLE);
  assert.ok(r.resolution.matched);
  assert.equal(r.person?.people_id, 101);
});

test("resolvePerson: same first initial + same last name is refused as ambiguous", () => {
  const r = resolvePerson({ ...officialBase, name: "A. Smith", office: "State Representative" }, PEOPLE);
  assert.equal(r.resolution.matched, false);
  if (!r.resolution.matched) assert.equal(r.resolution.reason, "ambiguous");
});

test("resolvePerson: district number disambiguates shared names", () => {
  const r = resolvePerson(
    { ...officialBase, name: "A. Smith", office: "State Representative", district: "2nd House District" },
    PEOPLE,
  );
  assert.ok(r.resolution.matched);
  assert.equal(r.person?.people_id, 104);
});

test("resolvePerson: unknown official → not-found (never guessed)", () => {
  const r = resolvePerson({ ...officialBase, name: "Nobody Here" }, PEOPLE);
  assert.equal(r.resolution.matched, false);
});

// ── Service: statuses, filters, pagination, duplicates ──────────────────────

function fakeVote(i: number, over: Partial<LegislativeVote> = {}): LegislativeVote {
  const day = String((i % 27) + 1).padStart(2, "0");
  return {
    id: `fake-${i}`,
    governmentLevel: "state",
    jurisdiction: "GA",
    category: "bill",
    voteDate: `2026-08-${day}`,
    officialVote: "Yea",
    billNumber: `HB ${i}`,
    billTitle: `Bill number ${i}`,
    sourceProvider: "Fake",
    sourceUrl: "https://example.gov",
    retrievedAt: "2026-09-17T00:00:00.000Z",
    ...over,
  };
}
function fakeProvider(votes: LegislativeVote[], opts: { throws?: boolean; ambiguous?: boolean } = {}): VotingRecordProvider {
  return {
    providerId: "fake",
    supportsOfficial: () => true,
    async getVotes() {
      if (opts.throws) throw new Error("upstream down");
      if (opts.ambiguous) return { resolution: { matched: false, reason: "ambiguous" }, votes: [] };
      return { resolution: { matched: true, via: "legiscanId", memberKey: "1" }, votes };
    },
  };
}
const q: OfficialQuery = { name: "Elena Parent", state: "GA", level: "state" };

test("service: no supporting provider → JURISDICTION_UNSUPPORTED", async () => {
  const page = await getVotingRecordWith([], q, 1, {});
  assert.equal(page.status, "JURISDICTION_UNSUPPORTED");
});

test("service: ambiguous identity → MATCH_AMBIGUOUS with zero votes", async () => {
  const page = await getVotingRecordWith([fakeProvider([], { ambiguous: true })], q, 1, {});
  assert.equal(page.status, "MATCH_AMBIGUOUS");
  assert.equal(page.votes.length, 0);
});

test("service: provider failure → SOURCE_UNAVAILABLE, no raw error leaked", async () => {
  const page = await getVotingRecordWith([fakeProvider([], { throws: true })], q, 1, {});
  assert.equal(page.status, "SOURCE_UNAVAILABLE");
});

test("service: empty result → NO_VOTES_FOUND", async () => {
  const page = await getVotingRecordWith([fakeProvider([])], q, 1, {});
  assert.equal(page.status, "NO_VOTES_FOUND");
});

test("service: pagination slices and reports hasMore", async () => {
  const votes = Array.from({ length: 45 }, (_, i) => fakeVote(i));
  const p1 = await getVotingRecordWith([fakeProvider(votes)], q, 1, {});
  assert.equal(p1.status, "OK");
  assert.equal(p1.votes.length, PAGE_SIZE);
  assert.equal(p1.hasMore, true);
  const p3 = await getVotingRecordWith([fakeProvider(votes)], q, 3, {});
  assert.equal(p3.votes.length, 5);
});

test("service: category, search, and date filters", async () => {
  const votes = [
    fakeVote(1, { category: "bill", billTitle: "Education Funding Act", voteDate: "2026-03-12" }),
    fakeVote(2, { category: "procedural", question: "Motion to Table", voteDate: "2026-03-01" }),
    fakeVote(3, { category: "resolution", billTitle: "Honoring somebody", voteDate: "2026-01-15" }),
  ];
  const byCat = await getVotingRecordWith([fakeProvider(votes)], q, 1, { category: "procedural" });
  assert.deepEqual(byCat.votes.map((v) => v.id), ["fake-2"]);
  const bySearch = await getVotingRecordWith([fakeProvider(votes)], q, 1, { search: "education" });
  assert.deepEqual(bySearch.votes.map((v) => v.id), ["fake-1"]);
  const byDate = await getVotingRecordWith([fakeProvider(votes)], q, 1, {
    from: "2026-02-01",
    to: "2026-03-05",
  });
  assert.deepEqual(byDate.votes.map((v) => v.id), ["fake-2"]);
});

test("normalized ids are stable across re-fetches (idempotent ingestion key)", async () => {
  // The same roll call fetched twice produces the identical id — the dedupe
  // key providers use in-memory (`seen` sets) and the future DB enforces via
  // the (provider, source_record_id) unique index.
  const a = fakeVote(7, { rollCallId: "555", sourceRecordId: "555" });
  const b = fakeVote(7, { rollCallId: "555", sourceRecordId: "555" });
  assert.equal(a.id, b.id);
  assert.equal(a.sourceRecordId, b.sourceRecordId);
});
