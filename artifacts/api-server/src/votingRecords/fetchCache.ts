/**
 * Fetch + cache layer for the voting-records providers.
 *
 * Roll-call XML is immutable once published, so parsed roll calls are cached
 * aggressively (12h TTL, bounded size); vote menus/latest-roll discovery are
 * short-lived (15 min). All in-memory — the api-server is stateless (no DB,
 * ephemeral disk on Render), matching its existing caching pattern. Cold
 * starts simply refill the cache on demand.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>();
  constructor(
    private ttlMs: number,
    private maxEntries: number,
  ) {}

  get(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T): void {
    if (this.map.size >= this.maxEntries) {
      // Drop the oldest insertion (Map preserves insertion order).
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

/** GET with timeout and one retry. Returns null on 404, throws on other failures. */
export async function fetchText(url: string, timeoutMs = 10_000): Promise<string | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "UDecide-API (civic information app)" },
      });
      if (res.status === 404) return null;
      if (res.status === 429) {
        // Rate limited: back off once, then give up (callers degrade gracefully).
        lastErr = new Error(`429 from ${url}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Run tasks with bounded concurrency, preserving order. Failed tasks yield null. */
export async function mapLimit<I, O>(
  items: I[],
  limit: number,
  fn: (item: I) => Promise<O>,
): Promise<(O | null)[]> {
  const out: (O | null)[] = new Array(items.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
