// Political news is proxied through the API Server, which serves nonpartisan
// election/voting updates (mock-backed today, live-ready behind the same route).
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface NewsFeed {
  newsUrl: string;
  title: string;
  description: string;
  source: string;
  articles: NewsArticle[];
}

export async function getNews(): Promise<NewsFeed> {
  const res = await fetch(`${API_BASE}/news`);
  if (!res.ok) {
    throw new Error(`Failed to load news (${res.status})`);
  }
  return (await res.json()) as NewsFeed;
}
