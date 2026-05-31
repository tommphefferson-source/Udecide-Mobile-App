import { Router, type IRouter, type RequestHandler } from "express";
import multer, { MulterError } from "multer";
import {
  DeleteAccountResponse,
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
  deleteAccount,
  editProfile,
  LegacyAuthError,
  stateCodeToId,
  uploadProfilePhoto,
  userLogin,
  userSignUp,
  type LegacyAuthUser,
} from "../providers/legacyWs";

const router: IRouter = Router();

// In-memory upload: profile photos are small and forwarded straight to the
// legacy backend, so there is no need to touch disk. 8 MB cap, images only.
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

// Translate multer parsing failures (oversize file, malformed multipart) into
// actionable 4xx responses instead of letting them fall through as a 500.
function photoUploadMiddleware(): RequestHandler {
  const handler = photoUpload.single("photo");
  return (req, res, next) => {
    handler(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "Image is too large. Maximum size is 8 MB." });
          return;
        }
        res.status(400).json({ error: `Invalid upload: ${err.message}` });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };
}

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

router.delete("/auth/account", async (req, res): Promise<void> => {
  const token = tokenFromRequest(req);
  if (!token) {
    throw new AppError(401, "Authentication token is required");
  }
  try {
    await deleteAccount(token);
    res.json(DeleteAccountResponse.parse({ success: true }));
  } catch (err) {
    if (err instanceof LegacyAuthError) {
      throw new AppError(401, err.message);
    }
    throw err;
  }
});

router.post(
  "/auth/profile/photo",
  photoUploadMiddleware(),
  async (req, res): Promise<void> => {
    const token = tokenFromRequest(req);
    if (!token) {
      throw new AppError(401, "Authentication token is required");
    }
    if (!req.file) {
      res.status(400).json({ error: "An image file is required under the 'photo' field" });
      return;
    }
    try {
      const user = await uploadProfilePhoto(
        {
          buffer: req.file.buffer,
          filename: req.file.originalname || "profile.jpg",
          mimetype: req.file.mimetype || "image/jpeg",
        },
        token,
      );
      res.json(UpdateProfileResponse.parse(toAuthResponse(user)));
    } catch (err) {
      if (err instanceof LegacyAuthError) {
        throw new AppError(401, err.message);
      }
      throw err;
    }
  },
);

export default router;
