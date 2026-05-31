import { config } from "../config";
import { newsContent as seed } from "../data/news";
import * as legacy from "../providers/legacyWs";

/**
 * Political news is served live from the legacy web service when a token is
 * available — either a per-user token forwarded by an authenticated client or
 * the shared app token. The legacy `/home_data` endpoint returns a single
 * `news_url`, which the app opens in a web view; it carries no article list, so
 * the live feed exposes the URL with an empty `articles` array. Without a token,
 * the local mock feed (with a sample article list) is used instead. Live and
 * mock content are never mixed.
 */

interface ApiNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface ApiNews {
  newsUrl: string;
  title: string;
  description: string;
  source: string;
  articles: ApiNewsArticle[];
}

function ensureScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isLive(token?: string): boolean {
  return Boolean(token ?? config.legacyWsAuthToken);
}

async function getNewsLive(token?: string): Promise<ApiNews> {
  const home = await legacy.fetchHomeData(token);
  const raw = home?.newsUrl?.trim();
  if (!raw) {
    // Live, but the upstream provided no news URL — surface an empty feed
    // rather than falling back to mock content.
    return {
      newsUrl: "",
      title: "Political News",
      description: "No news source is available right now.",
      source: "",
      articles: [],
    };
  }
  const url = ensureScheme(raw);
  return {
    newsUrl: url,
    title: "Political News",
    description: `Live nonpartisan political news from ${hostOf(url)}.`,
    source: hostOf(url),
    articles: [],
  };
}

export async function getNews(token?: string): Promise<ApiNews> {
  return isLive(token) ? getNewsLive(token) : seed;
}
