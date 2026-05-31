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

const router: IRouter = Router();

router.get("/polls", (_req, res): void => {
  res.json(ListPollsResponse.parse({ polls: listPolls() }));
});

router.post("/polls/:pollId/vote", (req, res): void => {
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
  const results = recordVote(params.data.pollId, body.data.optionId);
  res.json(VotePollResponse.parse(results));
});

router.get("/polls/:pollId/results", (req, res): void => {
  const params = GetPollResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  res.json(GetPollResultsResponse.parse(getResults(params.data.pollId)));
});

export default router;
