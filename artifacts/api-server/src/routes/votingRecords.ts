import { Router, type IRouter } from "express";
import { getVotingRecord, type VotingRecordFilters } from "../votingRecords/service";
import type { OfficialQuery, VoteCategory } from "../votingRecords/types";

const router: IRouter = Router();

const CATEGORIES = new Set([
  "all",
  "bill",
  "amendment",
  "resolution",
  "nomination",
  "procedural",
  "other",
]);

/**
 * GET /officials/voting-record
 *   ?name=&state=&level=&office=      identify the official
 *   &bioguideId=                      optional stable identifier (preferred)
 *   &page=1&category=&q=&from=&to=    paging + filters
 *
 * Returns a page of normalized roll-call votes with per-vote source URLs.
 * `status` distinguishes unsupported jurisdictions, unmatched/ambiguous
 * officials, empty results, and upstream failures so the client can show
 * an accurate, friendly message instead of a raw error.
 */
router.get("/officials/voting-record", async (req, res) => {
  const { name, state, level, office, district, bioguideId, legiscanId, page, category, q, from, to } =
    req.query;
  if (typeof name !== "string" || !name.trim() || typeof state !== "string" || !state.trim()) {
    res.status(400).json({ error: "name and state are required" });
    return;
  }
  const lvl = typeof level === "string" ? level : "federal";
  if (!["federal", "state", "local"].includes(lvl)) {
    res.status(400).json({ error: "invalid level" });
    return;
  }
  const pageNum = Math.max(1, Math.min(10, Number.parseInt(String(page ?? "1"), 10) || 1));
  const cat = typeof category === "string" && CATEGORIES.has(category) ? category : "all";
  const dateOk = (s: unknown): s is string =>
    typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const lsId = Number.parseInt(String(legiscanId ?? ""), 10);
  const official: OfficialQuery = {
    name,
    state,
    level: lvl as OfficialQuery["level"],
    office: typeof office === "string" ? office : undefined,
    district: typeof district === "string" && district ? district : undefined,
    identifiers: {
      ...(typeof bioguideId === "string" && bioguideId ? { bioguideId } : {}),
      ...(Number.isFinite(lsId) && lsId > 0 ? { legiscanId: lsId } : {}),
    },
  };
  const filters: VotingRecordFilters = {
    category: cat as VoteCategory | "all",
    search: typeof q === "string" && q.trim() ? q.trim().slice(0, 100) : undefined,
    from: dateOk(from) ? from : undefined,
    to: dateOk(to) ? to : undefined,
  };

  try {
    const result = await getVotingRecord(official, pageNum, filters);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "voting-record lookup failed");
    res.status(502).json({ error: "source_unavailable" });
  }
});

export default router;
