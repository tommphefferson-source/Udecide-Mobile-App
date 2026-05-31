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

export interface LegacyAuthUser {
  authToken: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  stateId: string;
  zipCode: string;
  phoneNumber: string;
  profileImage: string;
  status: string;
}

export interface LegacySignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  stateId: string;
  city: string;
  zipCode: string;
  phone?: string;
}

/** Raised when the legacy server rejects credentials or a registration. */
export class LegacyAuthError extends Error {}

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

/**
 * POST a JSON body to a legacy auth endpoint. Unlike {@link wsPost}, these
 * endpoints expect `application/json` and require NO `AUTHTOKEN` header (the
 * token is what you receive back). Throws {@link LegacyAuthError} with the
 * upstream message when `success !== "1"`.
 */
async function wsPostJson(
  path: string,
  body: Record<string, string>,
): Promise<unknown[]> {
  let res: Response;
  try {
    res = await fetch(`${config.legacyWsBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    throw new LegacyAuthError(
      envelope.settings?.message ?? `Legacy endpoint ${path} failed`,
    );
  }

  return Array.isArray(envelope.data) ? envelope.data : [];
}

function mapAuthUser(row: unknown): LegacyAuthUser {
  const o = (row ?? {}) as Record<string, unknown>;
  return {
    authToken: asString(o.auth_token) ?? "",
    userId: asString(o.user_id) ?? "",
    email: asString(o.user_email) ?? "",
    firstName: asString(o.first_name) ?? "",
    lastName: asString(o.last_name) ?? "",
    city: asString(o.city) ?? "",
    state: asString(o.state) ?? "",
    stateId: asString(o.state_id) ?? "",
    zipCode: asString(o.zip_code) ?? "",
    phoneNumber: asString(o.phone_number) ?? "",
    profileImage: asString(o.user_profile) ?? "",
    status: asString(o.status) ?? "",
  };
}

/** Authenticate against the legacy `/user_login` endpoint. */
export async function userLogin(
  email: string,
  password: string,
): Promise<LegacyAuthUser> {
  const rows = await wsPostJson("/user_login", {
    user_email: email,
    user_password: password,
    social_login_type: "",
    social_login_id: "",
  });
  const user = rows[0] ? mapAuthUser(rows[0]) : null;
  if (!user || !user.authToken) {
    throw new LegacyAuthError("Invalid email or password");
  }
  return user;
}

/** Register a new user against the legacy `/user_sign_up` endpoint. */
export async function userSignUp(
  input: LegacySignUpInput,
): Promise<LegacyAuthUser> {
  const body: Record<string, string> = {
    user_email: input.email,
    user_password: input.password,
    first_name: input.firstName,
    last_name: input.lastName,
    state_id: input.stateId,
    city: input.city,
    zipcode: input.zipCode,
  };
  if (input.phone) body.phone = input.phone;

  const rows = await wsPostJson("/user_sign_up", body);
  const user = rows[0] ? mapAuthUser(rows[0]) : null;
  // Some legacy deployments omit the token on signup; fall back to a login.
  if (user && user.authToken) return user;
  return userLogin(input.email, input.password);
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
