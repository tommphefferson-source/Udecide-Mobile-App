import { apiFetch } from "./apiClient";
import type { Poll } from "@/types/politics";

// Polls are proxied through the API Server to the legacy poll endpoints
// (/poll_listing, /poll_results, /polling). Every request goes through the
// shared apiFetch wrapper, which automatically attaches the AUTHTOKEN header
// (the auth_token saved at login/signup) and clears the session + redirects to
// login if the token is rejected.

const DISCLAIMER =
  "Community poll — results reflect app users and are not a scientific sample.";

interface ApiPollOption {
  id: string;
  label: string;
  votes: number;
}

interface ApiPoll {
  id: string;
  question: string;
  description: string | null;
  category: string | null;
  totalVotes: number;
  options: ApiPollOption[];
}

interface ApiPollList {
  polls: ApiPoll[];
}

interface ApiResultOption extends ApiPollOption {
  percentage: number;
}

interface ApiPollResults {
  pollId: string;
  question: string;
  totalVotes: number;
  options: ApiResultOption[];
}

function toPoll(p: ApiPoll): Poll {
  return {
    id: p.id,
    question: p.question,
    topic: p.category ?? "Poll",
    options: p.options.map((o) => ({ id: o.id, text: o.label, votes: o.votes })),
    totalVotes: p.totalVotes,
    createdAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

export async function getPolls(): Promise<Poll[]> {
  const res = await apiFetch("/polls");
  if (!res.ok) {
    throw new Error(`Failed to load polls (${res.status})`);
  }
  const data = (await res.json()) as ApiPollList;
  return data.polls.map(toPoll);
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  options: { id: string; votes: number }[];
}

export interface PollResultDetail {
  pollId: string;
  question: string;
  totalVotes: number;
  options: { id: string; label: string; votes: number; percentage: number }[];
}

interface ApiPollResultsList {
  results: ApiPollResults[];
}

/**
 * Fetch results for every poll from the legacy backend (/poll_results, proxied
 * by the API Server). Used by the "Poll Results" screen to show outcomes of all
 * previous polls.
 */
export async function getAllPollResults(): Promise<PollResultDetail[]> {
  const res = await apiFetch("/polls/results");
  if (!res.ok) {
    throw new Error(`Failed to load poll results (${res.status})`);
  }
  const data = (await res.json()) as ApiPollResultsList;
  return data.results.map((r) => ({
    pollId: r.pollId,
    question: r.question,
    totalVotes: r.totalVotes,
    options: r.options.map((o) => ({
      id: o.id,
      label: o.label,
      votes: o.votes,
      percentage: o.percentage,
    })),
  }));
}

export async function votePoll(
  pollId: string,
  optionId: string,
): Promise<PollResults> {
  const res = await apiFetch(`/polls/${encodeURIComponent(pollId)}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to record vote (${res.status})`);
  }
  const r = (await res.json()) as ApiPollResults;
  return {
    pollId: r.pollId,
    totalVotes: r.totalVotes,
    options: r.options.map((o) => ({ id: o.id, votes: o.votes })),
  };
}
