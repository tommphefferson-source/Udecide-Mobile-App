import { config } from "../config";
import { newsContent as seed } from "../data/news";
import { logger } from "../lib/logger";
import { parseRss } from "../lib/rss";
import * as legacy from "../providers/legacyWs";

/**
 * Political news is served live from the legacy web service when a token is
 * available — either a per-user token forwarded by an authenticated client or
 * the shared app token. The legacy `/home_data` endpoint returns a single
 * `news_url` that now points at an RSS feed (e.g. NPR politics). We fetch and
 * parse that feed server-side into a structured article list (with plain-text
 * bodies for in-app reading), so the client never has to handle XML. Without a
 * token, the local mock feed is used instead. Live and mock content are never
 * mixed.
 */

interface ApiNewsArticle {
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

interface ApiNews {
  newsUrl: string;
  title: string;
  description: string;
  source: string;
  articles: ApiNewsArticle[];
}

const MAX_ARTICLES = 25;
const FEED_TIMEOUT_MS = 8000;

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

/**
 * Guards the server-side feed fetch against SSRF. The feed URL comes from the
 * (trusted) legacy upstream, but we still require https and reject obviously
 * internal/private hostnames so a misconfigured or compromised upstream can't
 * make us request internal services.
 */
function isSafeFeedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return false;
  }
  // Block IP-literal hosts in private / loopback / link-local ranges.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254)
    ) {
      return false;
    }
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return false;
  }
  return true;
}

function isLive(token?: string): boolean {
  return Boolean(token ?? config.legacyWsAuthToken);
}

async function fetchFeedXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some feeds (e.g. NPR) reject requests without a User-Agent with 403.
        "User-Agent": "UDecide/1.0 (+https://udecide.app)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, "news feed responded with non-OK status");
      return null;
    }
    return await res.text();
  } catch (err) {
    logger.warn({ url, err }, "failed to fetch news feed");
    return null;
  } finally {
    clearTimeout(timer);
  }
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
  const source = hostOf(url);

  // Empty-but-honest live response: expose the URL (so the client can still
  // link out) with no fabricated articles. Used whenever the feed can't be
  // fetched or parsed — live mode never falls back to mock content.
  const emptyLive: ApiNews = {
    newsUrl: url,
    title: "Political News",
    description: `Live nonpartisan political news from ${source}.`,
    source,
    articles: [],
  };

  if (!isSafeFeedUrl(url)) {
    logger.warn({ url }, "refusing to fetch unsafe news feed URL");
    return emptyLive;
  }

  const xml = await fetchFeedXml(url);
  if (!xml) return emptyLive;

  try {
    const feed = parseRss(xml);
    const articles: ApiNewsArticle[] = feed.items.slice(0, MAX_ARTICLES).map((item, i) => ({
      id: item.guid || item.link || `article-${i}`,
      title: item.title,
      description: item.description,
      source: feed.title || source,
      url: item.link,
      publishedAt: item.publishedAt,
      content: item.content,
      imageUrl: item.imageUrl || undefined,
      author: item.author || undefined,
    }));

    return {
      newsUrl: url,
      title: feed.title || "Political News",
      description: feed.description || `Live nonpartisan political news from ${source}.`,
      source: feed.title || source,
      articles,
    };
  } catch (err) {
    logger.warn({ url, err }, "failed to parse news feed");
    return emptyLive;
  }
}

export async function getNews(token?: string): Promise<ApiNews> {
  return isLive(token) ? getNewsLive(token) : seed;
}
