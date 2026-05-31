import { MOCK_ELECTIONS } from "./mockData";
import type { Election, ElectionOffice, Candidate } from "@/types/politics";

const API_KEY = process.env.EXPO_PUBLIC_CIVIC_API_KEY;
const BASE_URL = "https://www.googleapis.com/civicinfo/v2";

export function isElectionsMockMode() {
  return !API_KEY;
}

// ── Google Civic Information API shapes ────────────────────────────────────

interface CivicElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

interface CivicAdminBody {
  name?: string;
  electionInfoUrl?: string;
  electionRegistrationUrl?: string;
  electionRegistrationConfirmationUrl?: string;
  absenteeVotingInfoUrl?: string;
  votingLocationFinderUrl?: string;
  ballotInfoUrl?: string;
  electionRulesUrl?: string;
}

interface CivicCandidate {
  name: string;
  party?: string;
  candidateUrl?: string;
  channels?: { type: string; id: string }[];
}

interface CivicContest {
  type?: string;
  office?: string;
  district?: { name?: string; scope?: string };
  candidates?: CivicCandidate[];
  level?: string[];
  roles?: string[];
}

interface CivicVoterInfo {
  election?: CivicElection;
  state?: { electionAdministrationBody?: CivicAdminBody }[];
  contests?: CivicContest[];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns upcoming elections for the user's state.
 * Uses Google Civic Information API /elections + /voterinfo for details.
 * Falls back to mock data when no API key is configured.
 */
export async function getElections(
  stateAbbr: string,
  address: { address: string; city: string; state: string; zipCode: string },
): Promise<Election[]> {
  if (isElectionsMockMode()) {
    console.warn("[Elections] No API key – using mock data");
    await new Promise((r) => setTimeout(r, 600));
    const stateUpper = (stateAbbr || "").toUpperCase();
    return MOCK_ELECTIONS.filter((e) => {
      const s = (e.state || "").toUpperCase();
      // Keep national elections plus those matching the active state
      return s === "US" || s === stateUpper;
    });
  }

  try {
    // Step 1: fetch the master list of upcoming elections
    const listRes = await fetch(`${BASE_URL}/elections?key=${API_KEY}`);
    if (!listRes.ok) throw new Error(`Elections list error ${listRes.status}`);
    const listData = (await listRes.json()) as { elections?: CivicElection[] };
    const allElections = (listData.elections ?? []).filter(
      (e) => e.id !== "2000", // skip the VIP test election
    );

    // Step 2: filter to elections relevant to this state (state-specific + national)
    const stateLower = stateAbbr.toLowerCase();
    const relevant = allElections.filter((e) => {
      const div = e.ocdDivisionId;
      return (
        div === "ocd-division/country:us" ||
        div.includes(`/state:${stateLower}`)
      );
    });

    // Live mode: if the feed has no election for this state, show an honest
    // empty state rather than fabricated mock data.
    if (relevant.length === 0) return [];

    // Step 3: for each relevant election, fetch voterinfo for admin links + contests
    const addressStr = buildAddressQuery(address);
    const results = await Promise.all(
      relevant.slice(0, 6).map((e) => fetchVoterInfo(e, addressStr)),
    );

    return results.filter((e): e is Election => e !== null);
  } catch (err) {
    console.error("[Elections] getElections failed:", err);
    // Live mode: surface the failure as an empty list, not fake elections.
    return [];
  }
}

// ── Internals ──────────────────────────────────────────────────────────────

async function fetchVoterInfo(
  civicElection: CivicElection,
  address: string,
): Promise<Election | null> {
  try {
    const url = `${BASE_URL}/voterinfo?key=${API_KEY}&electionId=${civicElection.id}&address=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    // 400 means the election doesn't cover this address — skip gracefully
    if (res.status === 400) return mapElectionNoVoterInfo(civicElection);
    if (!res.ok) return mapElectionNoVoterInfo(civicElection);

    const data = (await res.json()) as CivicVoterInfo;
    const admin = data.state?.[0]?.electionAdministrationBody ?? {};
    const contests = data.contests ?? [];
    return mapElection(civicElection, admin, contests);
  } catch {
    return mapElectionNoVoterInfo(civicElection);
  }
}

function mapElection(
  e: CivicElection,
  admin: CivicAdminBody,
  contests: CivicContest[],
): Election {
  const regUrl = admin.electionRegistrationUrl;
  const infoUrl = admin.electionInfoUrl ?? admin.ballotInfoUrl;

  return {
    id: e.id,
    name: e.name,
    date: e.electionDay,
    type: extractType(e.name),
    state: extractState(e.ocdDivisionId),
    registrationDeadline: regUrl
      ? `Register at: ${regUrl}`
      : "Check your state election website",
    earlyVotingStart: undefined,
    earlyVotingEnd: undefined,
    absenteeDeadline: admin.absenteeVotingInfoUrl
      ? `Absentee info: ${admin.absenteeVotingInfoUrl}`
      : undefined,
    offices:
      contests.length > 0 ? mapContests(contests) : buildOfficeStubs(infoUrl),
    // Store extra URLs for the UI to use
    ...({
      _registrationUrl: regUrl,
      _infoUrl: infoUrl,
      _ballotUrl: admin.ballotInfoUrl,
      _locationUrl: admin.votingLocationFinderUrl,
    } as object),
  };
}

function mapElectionNoVoterInfo(e: CivicElection): Election {
  return {
    id: e.id,
    name: e.name,
    date: e.electionDay,
    type: extractType(e.name),
    state: extractState(e.ocdDivisionId),
    registrationDeadline: "Check your state election website",
    offices: [],
  };
}

function mapContests(contests: CivicContest[]): ElectionOffice[] {
  return contests
    .filter((c) => c.office)
    .map((c, i) => ({
      id: `contest-${i}`,
      title: c.office ?? "Unknown Office",
      district: c.district?.name,
      candidates: (c.candidates ?? []).map(
        (cand, j) =>
          ({
            id: `cand-${i}-${j}`,
            name: cand.name,
            party: normaliseParty(cand.party),
            website: cand.candidateUrl,
            twitter: cand.channels?.find((ch) => ch.type === "Twitter")?.id,
            incumbentFlag: false,
          }) satisfies Candidate,
      ),
    }));
}

function buildOfficeStubs(infoUrl?: string): ElectionOffice[] {
  // No contest data yet — return empty so the UI shows the "coming soon" state
  return [];
}

function extractType(name: string): Election["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("runoff")) return "Runoff";
  if (lower.includes("special")) return "Special";
  if (lower.includes("primary")) return "Primary";
  return "General";
}

function extractState(ocdId: string): string {
  const match = ocdId.match(/\/state:([a-z]{2})/);
  return match ? match[1].toUpperCase() : "US";
}

function normaliseParty(raw?: string): string {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("democrat")) return "Democrat";
  if (lower.includes("republican")) return "Republican";
  if (lower.includes("libertarian")) return "Libertarian";
  if (lower.includes("independent")) return "Independent";
  if (lower.includes("green")) return "Green";
  if (lower.includes("nonpartisan") || lower.includes("non-partisan"))
    return "Nonpartisan";
  return raw;
}

function buildAddressQuery(addr: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): string {
  const parts = [addr.address, addr.city, addr.state, addr.zipCode].filter(
    Boolean,
  );
  // Fallback: if no street, use city+state so voterinfo still returns state admin info
  return parts.length > 0 ? parts.join(", ") : `${addr.state}`;
}
