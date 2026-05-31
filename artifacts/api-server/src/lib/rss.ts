/**
 * Minimal RSS 2.0 parser tailored to the feeds this app consumes (e.g. NPR's
 * politics feed). It avoids a heavyweight XML dependency by relying on the fact
 * that RSS items are regular and that rich HTML bodies arrive wrapped in CDATA.
 *
 * It extracts, per item, the title, link, description, publish date, a clean
 * plain-text body (from content:encoded when present, falling back to the
 * description), a lead image URL, and an author byline.
 */

export interface ParsedRssItem {
  title: string;
  link: string;
  description: string;
  content: string;
  imageUrl: string;
  author: string;
  publishedAt: string;
  guid: string;
}

export interface ParsedRssFeed {
  title: string;
  description: string;
  link: string;
  items: ParsedRssItem[];
}

/** Strip a CDATA wrapper if present, otherwise return the trimmed input. */
function unwrapCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (match ? match[1] : value).trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201C",
  rdquo: "\u201D",
};

/** Safely turn a numeric code point into a character, or return the original
 * token if it is out of the valid Unicode range (never throws). */
function safeCodePoint(code: number, original: string): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return original;
  try {
    return String.fromCodePoint(code);
  } catch {
    return original;
  }
}

/** Decode the small set of HTML entities that appear in these feeds. */
function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (whole, dec: string) => safeCodePoint(Number(dec), whole))
    .replace(/&#x([0-9a-fA-F]+);/g, (whole, hex: string) => safeCodePoint(parseInt(hex, 16), whole))
    .replace(/&([a-zA-Z]+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole);
}

/** Read the inner text of the first occurrence of <tag>...</tag>. */
function tag(xml: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i");
  const match = xml.match(re);
  return match ? unwrapCdata(match[1]) : undefined;
}

/** Extract the first image URL from an HTML fragment. */
function firstImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

/**
 * Convert an HTML fragment to readable plain text: drop tracking pixels and
 * image/figure markup, turn block-level tags into paragraph breaks, strip the
 * remaining tags, decode entities, and collapse excess whitespace.
 */
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<img[^>]*>/gi, "")
      .replace(/<figure[\s\S]*?<\/figure>/gi, "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalize an RSS pubDate to an ISO string; pass through if unparseable. */
function toIso(pubDate: string | undefined): string {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? pubDate : d.toISOString();
}

/** Parse an RSS 2.0 document into a structured feed. */
export function parseRss(xml: string): ParsedRssFeed {
  const channelMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/i);
  const channel = channelMatch ? channelMatch[1] : xml;

  // Channel metadata comes from the part before the first item.
  const channelHead = channel.split(/<item[\s>]/i)[0];

  const items: ParsedRssItem[] = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(channel)) !== null) {
    const block = m[1];
    const encoded = tag(block, "content:encoded") ?? "";
    const description = tag(block, "description") ?? "";
    const body = encoded || description;
    const text = htmlToText(body);
    const link = tag(block, "link") ?? "";
    const guid = tag(block, "guid") ?? link;
    items.push({
      title: decodeEntities(tag(block, "title") ?? "").trim(),
      link: link.trim(),
      description: htmlToText(description),
      content: text,
      imageUrl: firstImage(encoded) || firstImage(description),
      author: decodeEntities(tag(block, "dc:creator") ?? tag(block, "author") ?? "").trim(),
      publishedAt: toIso(tag(block, "pubDate")),
      guid: guid.trim(),
    });
  }

  return {
    title: decodeEntities(tag(channelHead, "title") ?? "").trim(),
    description: htmlToText(tag(channelHead, "description") ?? ""),
    link: (tag(channelHead, "link") ?? "").trim(),
    items,
  };
}
