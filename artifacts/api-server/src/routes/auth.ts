import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, SignupBody, SignupResponse } from "@workspace/api-zod";
import { AppError } from "../lib/errors";
import {
  LegacyAuthError,
  userLogin,
  userSignUp,
  type LegacyAuthUser,
} from "../providers/legacyWs";

const router: IRouter = Router();

function toAuthResponse(user: LegacyAuthUser) {
  const { authToken, ...rest } = user;
  return { authToken, user: rest };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const user = await userLogin(body.data.email, body.data.password);
    res.json(LoginResponse.parse(toAuthResponse(user)));
  } catch (err) {
    if (err instanceof LegacyAuthError) {
      throw new AppError(401, err.message);
    }
    throw err;
  }
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const body = SignupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const user = await userSignUp(body.data);
    res.json(SignupResponse.parse(toAuthResponse(user)));
  } catch (err) {
    if (err instanceof LegacyAuthError) {
      throw new AppError(400, err.message);
    }
    throw err;
  }
});

export default router;
