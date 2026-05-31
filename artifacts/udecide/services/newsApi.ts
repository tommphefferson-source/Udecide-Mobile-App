import { apiFetch } from "./apiClient";

// Political news is proxied through the API Server (mock-backed today, live-ready
// behind the same route). Requests go through the shared apiFetch wrapper, which
// attaches the AUTHTOKEN header (the auth_token saved at login/signup)
// automatically and centralizes session-expiry handling.

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  content?: string;
  imageUrl?: string;
  author?: string;
}

export interface NewsFeed {
  newsUrl: string;
  title: string;
  description: string;
  source: string;
  articles: NewsArticle[];
}

export async function getNews(): Promise<NewsFeed> {
  const res = await apiFetch("/news");
  if (!res.ok) {
    throw new Error(`Failed to load news (${res.status})`);
  }
  return (await res.json()) as NewsFeed;
}
