import { config } from "../config";
import { AppError, UpstreamError } from "../lib/errors";

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

/**
 * Raised when the legacy server rejects credentials, a registration, or an
 * AUTHTOKEN (expired/invalid session). Extends AppError with HTTP 401 so any
 * route that doesn't catch it explicitly still returns 401 — letting an
 * authenticated client clear its session and route back to login.
 */
export class LegacyAuthError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = "LegacyAuthError";
  }
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
  tokenOverride?: string,
): Promise<unknown[]> {
  // A per-user token (forwarded from an authenticated client) takes precedence
  // over the shared app token; requireToken throws only when neither exists.
  const token = tokenOverride ?? requireToken();

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

  // A rejected/expired AUTHTOKEN typically comes back as a 401/403; surface it
  // as an auth error (HTTP 401) so authenticated clients clear their session.
  if (res.status === 401 || res.status === 403) {
    throw new LegacyAuthError("Authentication token was rejected");
  }

  const text = await res.text().catch(() => "");
  let envelope: WsEnvelope;
  try {
    envelope = text ? (JSON.parse(text) as WsEnvelope) : {};
  } catch {
    throw new UpstreamError(`Legacy endpoint ${path} returned a non-JSON body`);
  }

  if (envelope.settings?.success !== "1") {
    const message = envelope.settings?.message ?? `Legacy endpoint ${path} failed`;
    // Some legacy deployments return a 200 with an auth-flavored failure message
    // instead of a 401. Match only explicit token/session-auth phrases so a
    // generic business error (e.g. "this poll has expired") is NOT misread as an
    // auth rejection and does not force the user to re-login.
    if (
      /unauthor|invalid token|invalid auth|token expired|expired token|not logged|login again|invalid session/i.test(
        message,
      )
    ) {
      throw new LegacyAuthError(message);
    }
    throw new UpstreamError(message);
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
  timeoutMs: number = TIMEOUT_MS,
): Promise<unknown[]> {
  let res: Response;
  try {
    res = await fetch(`${config.legacyWsBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
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

  // Signup is slow upstream (it sends a confirmation email), so allow longer.
  const rows = await wsPostJson("/user_sign_up", body, 30_000);
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
export async function fetchPolls(token?: string): Promise<LegacyPoll[]> {
  const rows = await wsPost("/poll_listing", {}, token);
  return rows.map(mapPoll).filter((p) => p.pollId);
}

/** Fetch results (totals + percentages) for every poll. */
export async function fetchPollResults(
  token?: string,
): Promise<LegacyPollResult[]> {
  const rows = await wsPost("/poll_results", {}, token);
  return rows.map(mapResult).filter((p) => p.pollId);
}

/**
 * Cast a vote. `answer` must be the literal `"option1"` or `"option2"`. Returns
 * the updated result for the poll, or null when the upstream omits it.
 */
export async function votePoll(
  pollId: string,
  answer: string,
  token?: string,
): Promise<LegacyPollResult | null> {
  const rows = await wsPost("/polling", { poll_id: pollId, answer }, token);
  const first = rows[0];
  return first ? mapResult(first) : null;
}

export interface LegacyIssueCategory {
  categoryId: string;
  category: string;
  status: string | null;
}

export interface LegacyIssueAnswer {
  answerId: string;
  answer: string;
}

export interface LegacyIssueQuestion {
  questionId: string;
  question: string;
  answers: LegacyIssueAnswer[];
}

function mapIssueCategory(row: unknown): LegacyIssueCategory {
  const o = (row ?? {}) as Record<string, unknown>;
  return {
    categoryId: asString(o.category_id) ?? "",
    category: asString(o.category) ?? "",
    status: asString(o.status),
  };
}

function mapIssueQuestion(row: unknown): LegacyIssueQuestion {
  const o = (row ?? {}) as Record<string, unknown>;
  const rawAnswers = Array.isArray(o.answers) ? o.answers : [];
  const answers: LegacyIssueAnswer[] = rawAnswers
    .map((a) => {
      const ao = (a ?? {}) as Record<string, unknown>;
      return {
        answerId: asString(ao.answer_id) ?? "",
        answer: asString(ao.answer) ?? "",
      };
    })
    .filter((a) => a.answerId && a.answer);
  return {
    questionId: asString(o.question_id) ?? "",
    question: asString(o.question) ?? "",
    answers,
  };
}

/** Fetch the list of issue categories (from `/quiz_menu_list`). */
export async function fetchIssueCategories(
  token?: string,
): Promise<LegacyIssueCategory[]> {
  const rows = await wsPost("/quiz_menu_list", {}, token);
  return rows.map(mapIssueCategory).filter((c) => c.categoryId && c.category);
}

/** Fetch the stance questions for a single issue category. */
export async function fetchIssueQuestions(
  categoryId: string,
  token?: string,
): Promise<LegacyIssueQuestion[]> {
  const rows = await wsPost(
    "/questionaires_listing",
    { category_id: categoryId },
    token,
  );
  return rows.map(mapIssueQuestion).filter((q) => q.questionId && q.question);
}

export interface LegacyHomeData {
  newsUrl: string | null;
  politicalSystemLink: string | null;
  voterStatusLink: string | null;
  presidentCabinetLink: string | null;
  presidentialElection: string | null;
  townUrl: string | null;
}

function mapHomeData(row: unknown): LegacyHomeData {
  const o = (row ?? {}) as Record<string, unknown>;
  return {
    newsUrl: asString(o.news_url),
    politicalSystemLink: asString(o.political_system_link),
    voterStatusLink: asString(o.voter_status_link),
    presidentCabinetLink: asString(o.president_cabinet_link),
    presidentialElection: asString(o.presidential_election),
    townUrl: asString(o.town_url),
  };
}

/**
 * Fetch the legacy home payload (`/home_data`). Carries reference links — most
 * notably `news_url`, which the app opens in a web view as its Political News
 * source. Returns null when the upstream provides no row.
 */
export async function fetchHomeData(
  token?: string,
): Promise<LegacyHomeData | null> {
  const rows = await wsPost("/home_data", {}, token);
  return rows[0] ? mapHomeData(rows[0]) : null;
}
