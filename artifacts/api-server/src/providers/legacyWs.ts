import { config } from "../config";
import { UpstreamError } from "../lib/errors";

/**
 * Provider for the legacy UDecide web service (CodeIgniter backend at
 * config.legacyWsBaseUrl). All endpoints are POST, form-urlencoded, and require
 * an `AUTHTOKEN` header. Responses use a `{ settings: { success, message }, data }`
 * envelope where `success === "1"` indicates success and `data` is an array.
 *
 * Polls are binary (option1 vs option2); only the results/vote endpoints carry
 * vote totals and percentages — the listing endpoint carries questions only.
 */

const TIMEOUT_MS = 12_000;

interface WsEnvelope {
  settings?: { success?: string; message?: string };
  data?: unknown;
}

export interface LegacyPoll {
  pollId: string;
  question: string;
  image: string | null;
  option1: string;
  option2: string;
  status: string | null;
}

export interface LegacyPollResult {
  pollId: string;
  question: string;
  image: string | null;
  option1: string;
  option2: string;
  option1Perc: number;
  option2Perc: number;
  totalVotes: number;
  userVotedFor: string | null;
}

function requireToken(): string {
  if (!config.legacyWsAuthToken) {
    throw new UpstreamError("Legacy web service auth token is not configured");
  }
  return config.legacyWsAuthToken;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : NaN;
  return Number.isFinite(n) ? n : 0;
}

async function wsPost(
  path: string,
  params: Record<string, string>,
): Promise<unknown[]> {
  const token = requireToken();

  let res: Response;
  try {
    res = await fetch(`${config.legacyWsBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        AUTHTOKEN: token,
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError(`Failed to reach legacy endpoint ${path}`);
  }

  const text = await res.text().catch(() => "");
  let envelope: WsEnvelope;
  try {
    envelope = text ? (JSON.parse(text) as WsEnvelope) : {};
  } catch {
    throw new UpstreamError(`Legacy endpoint ${path} returned a non-JSON body`);
  }

  if (envelope.settings?.success !== "1") {
    throw new UpstreamError(
      envelope.settings?.message ?? `Legacy endpoint ${path} failed`,
    );
  }

  return Array.isArray(envelope.data) ? envelope.data : [];
}

function mapPoll(row: unknown): LegacyPoll {
  const o = (row ?? {}) as Record<string, unknown>;
  return {
    pollId: asString(o.poll_id) ?? "",
    question: asString(o.poll_question) ?? "",
    image: asString(o.poll_image),
    option1: asString(o.option1) ?? "Option 1",
    option2: asString(o.option2) ?? "Option 2",
    status: asString(o.poll_status),
  };
}

function mapResult(row: unknown): LegacyPollResult {
  const o = (row ?? {}) as Record<string, unknown>;
  return {
    pollId: asString(o.poll_id) ?? "",
    question: asString(o.poll_question) ?? "",
    image: asString(o.poll_image),
    option1: asString(o.option1) ?? "Option 1",
    option2: asString(o.option2) ?? "Option 2",
    option1Perc: asNumber(o.option1_perc),
    option2Perc: asNumber(o.option2_perc),
    totalVotes: Math.round(asNumber(o.total_votes_count)),
    userVotedFor: asString(o.user_voted_for),
  };
}

/** Fetch the catalog of available polls (no vote totals). */
export async function fetchPolls(): Promise<LegacyPoll[]> {
  const rows = await wsPost("/poll_listing", {});
  return rows.map(mapPoll).filter((p) => p.pollId);
}

/** Fetch results (totals + percentages) for every poll. */
export async function fetchPollResults(): Promise<LegacyPollResult[]> {
  const rows = await wsPost("/poll_results", {});
  return rows.map(mapResult).filter((p) => p.pollId);
}

/**
 * Cast a vote. `answer` must be the literal `"option1"` or `"option2"`. Returns
 * the updated result for the poll, or null when the upstream omits it.
 */
export async function votePoll(
  pollId: string,
  answer: string,
): Promise<LegacyPollResult | null> {
  const rows = await wsPost("/polling", { poll_id: pollId, answer });
  const first = rows[0];
  return first ? mapResult(first) : null;
}
