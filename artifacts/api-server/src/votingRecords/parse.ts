import type { LegislativeVote, OfficialVote, VoteCategory } from "./types";

/**
 * Purpose-built parsers for the two official congressional XML formats
 * (verified live against clerk.house.gov and senate.gov, 2026-09). They are
 * deliberately narrow: every parse validates the fields it depends on and
 * returns null on unexpected shape so a silent source-schema change can never
 * produce wrong data — the caller logs and surfaces "unavailable" instead.
 * No XML-parser dependency: the formats are flat and regular.
 */

// ── Small XML helpers ───────────────────────────────────────────────────────
function tag(src: string, name: string): string | undefined {
  // `(?:\s[^>]*)?` requires the tag name to end immediately — so looking up
  // <vote_result> can never match <vote_result_text>.
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(src);
  return m ? m[1].trim() : undefined;
}
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function int(s: string | undefined): number | undefined {
  if (s === undefined || s.trim() === "") return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "20-Jul-2026" → "2026-07-20" (House action-date). */
export function parseHouseDate(raw: string): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  return mm ? `${m[3]}-${mm}-${m[1].padStart(2, "0")}` : null;
}

/** "September 15, 2026,  05:00 PM" → "2026-09-15" (Senate vote_date). */
export function parseSenateDate(raw: string): string | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/.exec(raw.trim());
  if (!m) return null;
  const mm = MONTHS[m[1].slice(0, 3).toLowerCase()];
  return mm ? `${m[3]}-${mm}-${m[2].padStart(2, "0")}` : null;
}

export function normalizeVote(raw: string): OfficialVote {
  const v = raw.trim().toLowerCase();
  if (v === "yea" || v === "aye" || v === "yes" || v === "guilty") return "Yea";
  if (v === "nay" || v === "no" || v === "not guilty") return "Nay";
  if (v === "present" || v === "present, giving live pair") return "Present";
  if (v === "not voting" || v === "absent") return "Not Voting";
  if (v === "abstain") return "Abstain";
  return "Other";
}

/** Source-faithful classification for UI filters (never shown as judgment). */
export function categorize(question: string | undefined, billNumber: string | undefined): VoteCategory {
  const q = (question ?? "").toLowerCase();
  if (q.includes("nomination") || q.includes("confirmation")) return "nomination";
  if (q.includes("amendment") || q.includes("amdt")) return "amendment";
  if (
    q.includes("cloture") ||
    q.includes("motion to recommit") ||
    q.includes("motion to table") ||
    q.includes("motion to proceed") ||
    q.includes("previous question") ||
    q.includes("motion to adjourn") ||
    q.includes("quorum") ||
    q.includes("journal") ||
    q.includes("motion to suspend the rules") === false && q.startsWith("on motion")
  )
    return "procedural";
  const b = (billNumber ?? "").toUpperCase();
  if (b.includes("RES")) return "resolution"; // federal H.Res./S.J.Res. etc.
  // Federal bills use dots ("H.R. 1", "S. 4668"); state bills don't ("HB 123").
  if (/^(H\.?\s?R\.|S\.)\s*\d/.test(b)) return "bill";
  // State-style resolutions (no dots): HR/SR/HJR/SJR/HCR/SCR/AJR/ACR + number
  if (/^[HSA][JC]?R\s+\d/.test(b)) return "resolution";
  // State-style bills: HB/SB/AB/LB/SF/HF…
  if (/^(HB|SB|AB|LB|SF|HF|H|S)\s+\d/.test(b)) return "bill";
  return "other";
}

// ── House (Office of the Clerk, clerk.house.gov/evs/{year}/roll{NNN}.xml) ───

export interface HouseMemberVote {
  bioguideId: string;
  lastName: string;
  state: string;
  party: string;
  vote: OfficialVote;
}
export interface HouseRollCall {
  congress: number;
  session: string;
  rollNumber: number;
  billNumber?: string;
  billTitle?: string;
  question?: string;
  result?: string;
  voteDate: string;
  yeaCount?: number;
  nayCount?: number;
  presentCount?: number;
  notVotingCount?: number;
  members: HouseMemberVote[];
}

/** "H R 4541" → "H.R. 4541", "H RES 7" → "H.Res. 7", "S 123" → "S. 123". */
function normalizeLegisNum(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = /^([A-Z]+(?:\s[A-Z]+)*?)\s+(\d+)$/.exec(raw.trim().toUpperCase());
  if (!m) return raw.trim() || undefined;
  const prefixes: Record<string, string> = {
    "H R": "H.R.", "S": "S.", "H RES": "H.Res.", "S RES": "S.Res.",
    "H J RES": "H.J.Res.", "S J RES": "S.J.Res.", "H CON RES": "H.Con.Res.",
    "S CON RES": "S.Con.Res.",
  };
  return `${prefixes[m[1]] ?? m[1]} ${m[2]}`;
}

export function parseHouseRollCall(xml: string): HouseRollCall | null {
  if (!xml.includes("<rollcall-vote>")) return null;
  const congress = int(tag(xml, "congress"));
  const rollNumber = int(tag(xml, "rollcall-num"));
  const rawDate = tag(xml, "action-date");
  const voteDate = rawDate ? parseHouseDate(rawDate) : null;
  if (congress === undefined || rollNumber === undefined || !voteDate) return null;

  const totalsBlock = tag(xml, "totals-by-vote") ?? "";
  const members: HouseMemberVote[] = [];
  const re =
    /<recorded-vote><legislator name-id="([^"]*)"[^>]*?state="([^"]*)"[^>]*>([^<]*)<\/legislator><vote>([^<]*)<\/vote><\/recorded-vote>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    members.push({
      bioguideId: m[1],
      state: m[2],
      lastName: decode(m[3]),
      party: /party="([^"]*)"/.exec(m[0])?.[1] ?? "",
      vote: normalizeVote(m[4]),
    });
  }
  if (members.length === 0) return null; // shape guard: a roll call without members is a format change

  const question = tag(xml, "vote-question");
  const billNumber = normalizeLegisNum(tag(xml, "legis-num"));
  return {
    congress,
    session: (tag(xml, "session") ?? "").replace(/(st|nd|rd|th)$/, ""),
    rollNumber,
    billNumber,
    billTitle: tag(xml, "vote-desc") ? decode(tag(xml, "vote-desc")!) : undefined,
    question: question ? decode(question) : undefined,
    result: tag(xml, "vote-result"),
    voteDate,
    yeaCount: int(tag(totalsBlock, "yea-total")),
    nayCount: int(tag(totalsBlock, "nay-total")),
    presentCount: int(tag(totalsBlock, "present-total")),
    notVotingCount: int(tag(totalsBlock, "not-voting-total")),
    members,
  };
}

// ── Senate (LIS, senate.gov/legislative/LIS/...) ────────────────────────────

export interface SenateMenuEntry {
  voteNumber: number;
  issue?: string; // "S. 4668"
  question?: string;
  result?: string;
  title?: string;
  yeas?: number;
  nays?: number;
}

export function parseSenateVoteMenu(xml: string): SenateMenuEntry[] | null {
  if (!xml.includes("<vote_summary>")) return null;
  const out: SenateMenuEntry[] = [];
  const re = /<vote>([\s\S]*?)<\/vote>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const num = int(tag(block, "vote_number"));
    if (num === undefined) continue;
    out.push({
      voteNumber: num,
      issue: tag(block, "issue") ? decode(tag(block, "issue")!) : undefined,
      question: tag(block, "question") ? decode(tag(block, "question")!) : undefined,
      result: tag(block, "result"),
      title: tag(block, "title") ? decode(tag(block, "title")!) : undefined,
      yeas: int(tag(block, "yeas")),
      nays: int(tag(block, "nays")),
    });
  }
  return out.length > 0 ? out : null;
}

export interface SenateMemberVote {
  lisMemberId: string;
  lastName: string;
  firstName: string;
  state: string;
  party: string;
  vote: OfficialVote;
}
export interface SenateRollCall {
  congress: number;
  session: string;
  voteNumber: number;
  billNumber?: string;
  billTitle?: string;
  question?: string;
  result?: string;
  voteDate: string;
  yeaCount?: number;
  nayCount?: number;
  presentCount?: number;
  notVotingCount?: number;
  members: SenateMemberVote[];
}

export function parseSenateRollCall(xml: string): SenateRollCall | null {
  if (!xml.includes("<roll_call_vote>")) return null;
  const congress = int(tag(xml, "congress"));
  const voteNumber = int(tag(xml, "vote_number"));
  const rawDate = tag(xml, "vote_date");
  const voteDate = rawDate ? parseSenateDate(rawDate) : null;
  if (congress === undefined || voteNumber === undefined || !voteDate) return null;

  const members: SenateMemberVote[] = [];
  const re = /<member>([\s\S]*?)<\/member>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const last = tag(b, "last_name");
    const state = tag(b, "state");
    const cast = tag(b, "vote_cast");
    if (!last || !state || !cast) continue;
    members.push({
      lisMemberId: tag(b, "lis_member_id") ?? "",
      lastName: decode(last),
      firstName: decode(tag(b, "first_name") ?? ""),
      state,
      party: tag(b, "party") ?? "",
      vote: normalizeVote(cast),
    });
  }
  if (members.length === 0) return null;

  const countBlock = tag(xml, "count") ?? "";
  const docName = tag(xml, "document_name");
  return {
    congress,
    session: tag(xml, "session") ?? "",
    voteNumber,
    billNumber: docName ? decode(docName) : undefined,
    billTitle: tag(xml, "vote_title")
      ? decode(tag(xml, "vote_title")!)
      : tag(xml, "vote_document_text")
        ? decode(tag(xml, "vote_document_text")!)
        : undefined,
    question: tag(xml, "question") ? decode(tag(xml, "question")!) : undefined,
    result: tag(xml, "vote_result"),
    voteDate,
    yeaCount: int(tag(countBlock, "yeas")),
    nayCount: int(tag(countBlock, "nays")),
    presentCount: int(tag(countBlock, "present")),
    notVotingCount: int(tag(countBlock, "absent")),
    members,
  };
}

export type { LegislativeVote };
