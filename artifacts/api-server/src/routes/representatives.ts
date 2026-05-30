import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Server-only secret. The legacy EXPO_PUBLIC_* name is read as a fallback only
// so the proxy keeps working until that client-exposed secret is removed.
const CICERO_API_KEY =
  process.env.CICERO_API_KEY ?? process.env.EXPO_PUBLIC_CICERO_API_KEY;
const CICERO_URL = "https://app.cicerodata.com/v3.1/official";

interface CiceroUpstream {
  response?: {
    results?: {
      candidates?: { officials?: unknown[] }[];
    };
  };
}

/**
 * Proxies the Cicero "official by address" lookup. Keeping this server-side
 * hides the paid API key from the mobile client and avoids browser CORS
 * restrictions (Cicero does not send Access-Control-Allow-Origin).
 *
 * Responds with `{ live, officials }`:
 *   - live=false when no key is configured (client should show sample data)
 *   - live=true with the flattened officials list otherwise
 */
router.get("/representatives", async (req, res) => {
  if (!CICERO_API_KEY) {
    res.json({ live: false, officials: [] });
    return;
  }

  const { address, city, state, zip } = req.query;
  const params = new URLSearchParams({
    format: "json",
    search_country: "US",
    key: CICERO_API_KEY,
  });
  if (typeof address === "string" && address)
    params.set("search_address", address);
  if (typeof city === "string" && city) params.set("search_city", city);
  if (typeof state === "string" && state) params.set("search_state", state);
  if (typeof zip === "string" && zip) params.set("search_postal_code", zip);

  try {
    const upstream = await fetch(`${CICERO_URL}?${params.toString()}`);
    if (!upstream.ok) {
      req.log.error({ status: upstream.status }, "Cicero upstream error");
      res
        .status(502)
        .json({ live: true, officials: [], error: "upstream_error" });
      return;
    }
    const data = (await upstream.json()) as CiceroUpstream;
    const officials =
      data.response?.results?.candidates?.flatMap((c) => c.officials ?? []) ??
      [];
    res.json({ live: true, officials });
  } catch (err) {
    req.log.error({ err }, "Cicero proxy failed");
    res.status(502).json({ live: true, officials: [], error: "proxy_failed" });
  }
});

export default router;
