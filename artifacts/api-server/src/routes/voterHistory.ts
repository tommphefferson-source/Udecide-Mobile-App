import { Router, type IRouter } from "express";
import { getVoterHistory, datasetLoadError } from "../voterHistory/store";
import { getJurisdiction } from "../voterHistory/jurisdictions";

const router: IRouter = Router();

/**
 * GET /officials/voter-history?name=&state=&office=
 *
 * Election-participation history for an elected official. Returns a controlled
 * view (see voterHistory/store.ts) — never raw voter-file rows, and never
 * anything implying ballot choice. `status` distinguishes missing data from
 * non-participation; clients must preserve that distinction.
 */
router.get("/officials/voter-history", (req, res) => {
  const { name, state, office } = req.query;
  if (typeof name !== "string" || !name.trim() || typeof state !== "string" || !state.trim()) {
    res.status(400).json({ error: "name and state are required" });
    return;
  }

  const loadError = datasetLoadError();
  if (loadError) {
    // Dataset configured but unreadable — fail closed, never guess.
    req.log.error({ loadError }, "voter-history dataset failed to load");
    res.status(503).json({ error: "voter_history_unavailable" });
    return;
  }

  const view = getVoterHistory({
    name,
    state,
    office: typeof office === "string" ? office : undefined,
  });
  res.json(view);
});

/**
 * GET /officials/voter-history/config?state=
 * Jurisdiction availability/legal-gate summary (no personal data). Lets
 * clients decide whether to show the feature at all for a state.
 */
router.get("/officials/voter-history/config", (req, res) => {
  const { state } = req.query;
  if (typeof state !== "string" || !state.trim()) {
    res.status(400).json({ error: "state is required" });
    return;
  }
  const cfg = getJurisdiction(state);
  res.json({
    state: cfg.state,
    available: cfg.voterHistoryAvailable,
    publicDisplayAllowed: cfg.publicDisplayAllowed,
    attribution: cfg.attributionRequired,
  });
});

export default router;
