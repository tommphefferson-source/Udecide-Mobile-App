// Issue questionnaires are served by the API Server, which proxies the legacy
// web service live when an auth token is forwarded (and falls back to mock data
// otherwise). Requests go through the shared apiFetch wrapper, which attaches the
// AUTHTOKEN header (the auth_token saved at login/signup) automatically.
import { apiFetch } from "./apiClient";

export interface IssueQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface IssueQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: IssueQuestion[];
}

export async function getQuestionnaires(): Promise<IssueQuestionnaire[]> {
  const res = await apiFetch("/questionnaires");
  if (!res.ok) {
    throw new Error(`Failed to load questionnaires (${res.status})`);
  }
  const data = (await res.json()) as { questionnaires: IssueQuestionnaire[] };
  return data.questionnaires;
}
