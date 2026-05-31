import { type ErrorRequestHandler } from "express";

/**
 * Application error carrying an HTTP status. Thrown from services/providers and
 * translated into a consistent `{ error }` JSON body by `errorHandler`.
 */
export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

/** Raised when an upstream provider (e.g. Google Civic) fails. */
export class UpstreamError extends AppError {
  constructor(message = "Upstream provider error") {
    super(502, message);
    this.name = "UpstreamError";
  }
}

/**
 * Express error-handling middleware. Express 5 auto-forwards rejected async
 * handlers here, so route handlers can simply `throw` an AppError.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    req.log.warn({ err: err.message, status: err.status }, "Handled error");
    res.status(err.status).json({ error: err.message });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
