/**
 * Elected Official Voter History — client for the api-server's
 * /officials/voter-history endpoint.
 *
 * Displays election PARTICIPATION only. Ballots are secret: nothing here may
 * represent or imply whom an official voted for. The server enforces
 * per-state legal gates and identity-match thresholds; the client's job is to
 * render exactly what the server sends, preserve the distinction between
 * "no record" and "did not vote" (which we never claim), and label sample
 * (fixture) data as such.
 */
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface VoterHistoryEntry {
  electionDate: string; // ISO yyyy-mm-dd
  electionName: string;
  electionType: string;
  participated: boolean;
  votingMethod?: string;
  source: string;
  recordedAt: string;
}

export type VoterHistoryStatus =
  | "OK"
  | "DATA_NOT_AVAILABLE"
  | "DATA_NOT_PUBLIC"
  | "MATCH_UNCERTAIN"
  | "NO_PARTICIPATION_RECORDED"
  | "PARTICIPATED";

export interface VoterHistoryResult {
  status: VoterHistoryStatus;
  jurisdiction: string;
  officialName: string;
  fixture: boolean;
  attribution: string;
  history: VoterHistoryEntry[];
}

/**
 * Fetches participation history for an official. Returns null on any
 * network/server failure — the UI simply omits the section rather than
 * showing an error for this supplementary data.
 */
export async function getOfficialVoterHistory(params: {
  name: string;
  state: string;
  office?: string;
}): Promise<VoterHistoryResult | null> {
  if (!params.name.trim() || !params.state.trim()) return null;
  const qs = new URLSearchParams({ name: params.name, state: params.state });
  if (params.office) qs.set("office", params.office);
  try {
    const res = await fetch(`${API_BASE}/officials/voter-history?${qs.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as VoterHistoryResult;
  } catch {
    return null;
  }
}
