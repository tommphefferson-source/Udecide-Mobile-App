import { Router, type IRouter } from "express";
import {
  LoginBody,
  LoginResponse,
  SignupBody,
  SignupResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import { AppError } from "../lib/errors";
import { tokenFromRequest } from "../lib/requestToken";
import {
  editProfile,
  LegacyAuthError,
  stateCodeToId,
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

router.post("/auth/profile", async (req, res): Promise<void> => {
  const token = tokenFromRequest(req);
  if (!token) {
    throw new AppError(401, "Authentication token is required");
  }
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  // Reject unknown state codes up front so the change is never silently dropped
  // by the legacy backend (which would otherwise return success unchanged).
  if (body.data.state && stateCodeToId(body.data.state) === null) {
    res.status(400).json({ error: `Unknown state code: ${body.data.state}` });
    return;
  }
  try {
    const user = await editProfile(body.data, token);
    res.json(UpdateProfileResponse.parse(toAuthResponse(user)));
  } catch (err) {
    if (err instanceof LegacyAuthError) {
      throw new AppError(401, err.message);
    }
    throw err;
  }
});

export default router;
