import { Router, type IRouter } from "express";
import {
  GetElectionsResponse,
  GetVoterInfoResponse,
  GetVoterInfoQueryParams,
} from "@workspace/api-zod";
import { fetchElections, fetchVoterInfo } from "../providers/googleCivic";

const router: IRouter = Router();

router.get("/elections", async (_req, res): Promise<void> => {
  const elections = await fetchElections();
  res.json(GetElectionsResponse.parse({ elections }));
});

router.get("/elections/voter-info", async (req, res): Promise<void> => {
  const query = GetVoterInfoQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const voterInfo = await fetchVoterInfo(
    query.data.address,
    query.data.electionId ?? undefined,
  );
  res.json(GetVoterInfoResponse.parse(voterInfo));
});

export default router;
