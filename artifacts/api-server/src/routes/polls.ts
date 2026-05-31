import { Router, type IRouter } from "express";
import {
  ListPollsResponse,
  VotePollResponse,
  GetPollResultsResponse,
  VotePollBody,
  VotePollParams,
  GetPollResultsParams,
} from "@workspace/api-zod";
import { listPolls, getResults, recordVote } from "../services/pollsService";
import { tokenFromRequest } from "../lib/requestToken";

const router: IRouter = Router();

// Each handler forwards the per-user AUTHTOKEN (read from the request) to the
// legacy poll endpoints (/poll_listing, /poll_results, /polling). A rejected or
// expired token surfaces as a 401 (LegacyAuthError) so the client can re-login.
router.get("/polls", async (req, res): Promise<void> => {
  const token = tokenFromRequest(req);
  res.json(ListPollsResponse.parse({ polls: await listPolls(token) }));
});

router.post("/polls/:pollId/vote", async (req, res): Promise<void> => {
  const params = VotePollParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = VotePollBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const results = await recordVote(
    params.data.pollId,
    body.data.optionId,
    tokenFromRequest(req),
  );
  res.json(VotePollResponse.parse(results));
});

router.get("/polls/:pollId/results", async (req, res): Promise<void> => {
  const params = GetPollResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  res.json(
    GetPollResultsResponse.parse(
      await getResults(params.data.pollId, tokenFromRequest(req)),
    ),
  );
});

export default router;
