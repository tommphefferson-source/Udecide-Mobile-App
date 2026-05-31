import { Router, type IRouter } from "express";
import { GetStaticPageResponse } from "@workspace/api-zod";
import { AppError } from "../lib/errors";
import { fetchStaticPage } from "../providers/legacyWs";

const router: IRouter = Router();

// Static CMS pages (About Us, Privacy Policy, Terms & Conditions) served by the
// legacy `/static_pages` endpoint keyed by a page code. Public — no auth needed.
router.get("/pages/:code", async (req, res): Promise<void> => {
  const code = req.params.code.trim();
  if (!code) {
    res.status(400).json({ error: "A page code is required" });
    return;
  }
  const page = await fetchStaticPage(code);
  if (!page) {
    throw new AppError(404, "Page not found");
  }
  res.json(GetStaticPageResponse.parse(page));
});

export default router;
