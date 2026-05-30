import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Server-only secret — never expose via an EXPO_PUBLIC_* name (that would bundle
// it into the public mobile-app build).
const CICERO_API_KEY = process.env.CICERO_API_KEY;
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
    // Cicero defaults to 40 results per candidate. The federal cabinet plus
    // statewide executives can fill that window and crowd out county/city
    // officials, so request the full set to guarantee local reps come through.
    max: "200",
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
    const breakdown: Record<string, number> = {};
    for (const o of officials as Array<{
      office?: { district?: { district_type?: string; subtype?: string } };
    }>) {
      const d = o.office?.district;
      const key = `${d?.district_type ?? "?"}/${d?.subtype ?? "-"}`;
      breakdown[key] = (breakdown[key] ?? 0) + 1;
    }
    req.log.info(
      { address, city, state, zip, total: officials.length, breakdown },
      "Cicero reps diagnostic",
    );
    res.json({ live: true, officials });
  } catch (err) {
    req.log.error({ err }, "Cicero proxy failed");
    res.status(502).json({ live: true, officials: [], error: "proxy_failed" });
  }
});

export default router;
