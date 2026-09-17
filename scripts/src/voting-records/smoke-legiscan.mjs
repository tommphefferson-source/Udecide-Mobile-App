#!/usr/bin/env node
/**
 * LegiScan live smoke test — verifies the exact operation chain the
 * api-server's LegiScanProvider uses, against the real API:
 *   getSessionList → getSessionPeople → getMasterList → getBill → getRollCall
 *
 * Usage:
 *   LEGISCAN_API_KEY=... node scripts/src/voting-records/smoke-legiscan.mjs GA "Jones"
 *
 * Prints the resolved legislator, one recent roll call, and that
 * legislator's recorded position — the same flow the app serves. Run this
 * once after setting LEGISCAN_API_KEY on the server to confirm the
 * integration end-to-end (Phase 7 verification for the LegiScan path).
 * Read-only; uses ~5-45 of the monthly query budget.
 */
const KEY = process.env.LEGISCAN_API_KEY;
if (!KEY) {
  console.error("Set LEGISCAN_API_KEY (register free at https://legiscan.com/legiscan).");
  process.exit(2);
}
const [state = "GA", lastName = ""] = process.argv.slice(2);

async function op(name, params) {
  const qs = new URLSearchParams({ key: KEY, op: name, ...params });
  const res = await fetch(`https://api.legiscan.com/?${qs}`);
  const json = await res.json();
  if (json.status !== "OK") throw new Error(`${name}: ${JSON.stringify(json.alert ?? json)}`);
  return json;
}

const { sessions } = await op("getSessionList", { state });
const session = sessions.find((s) => s.prior === 0 && s.special === 0) ?? sessions[0];
console.log(`session: ${session.session_name} (id ${session.session_id})`);

const people = (await op("getSessionPeople", { id: String(session.session_id) })).sessionpeople.people;
console.log(`people in session: ${people.length}`);
const person = lastName
  ? people.find((p) => (p.last_name ?? "").toLowerCase() === lastName.toLowerCase())
  : people[0];
if (!person) {
  console.error(`No legislator with last name "${lastName}" in this session.`);
  process.exit(1);
}
console.log(`legislator: ${person.name} | people_id ${person.people_id} | ${person.role} ${person.district ?? ""} | bioguide ${person.bioguide_id ?? "—"}`);

const master = (await op("getMasterList", { id: String(session.session_id) })).masterlist;
const bills = Object.values(master)
  .filter((b) => b && typeof b === "object" && "bill_id" in b)
  .sort((a, b) => (b.last_action_date ?? "").localeCompare(a.last_action_date ?? ""));
console.log(`bills in masterlist: ${bills.length}; scanning newest for roll calls…`);

for (const entry of bills.slice(0, 40)) {
  const { bill } = await op("getBill", { id: String(entry.bill_id) });
  if (!bill.votes?.length) continue;
  const ref = bill.votes[bill.votes.length - 1];
  const { roll_call } = await op("getRollCall", { id: String(ref.roll_call_id) });
  const mine = roll_call.votes.find((v) => v.people_id === person.people_id);
  console.log(`\nbill: ${bill.bill_number} — ${bill.title}`);
  console.log(`roll call ${roll_call.roll_call_id}: "${roll_call.desc}" on ${roll_call.date} → yea ${roll_call.yea} / nay ${roll_call.nay} (passed=${roll_call.passed})`);
  console.log(`official record link (state_link): ${ref.state_link ?? bill.state_link ?? "—"}`);
  console.log(
    mine
      ? `${person.name} voted: ${mine.vote_text} (vote_id ${mine.vote_id}) ✓ full chain verified`
      : `${person.name} has no position on this roll call (different chamber?) — chain still verified`,
  );
  process.exit(0);
}
console.error("No bills with roll calls found in the newest 40 — try another state or later in session.");
process.exit(1);
