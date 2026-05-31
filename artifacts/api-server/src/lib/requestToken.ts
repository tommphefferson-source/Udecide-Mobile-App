import type { Request } from "express";

/**
 * Read a forwarded legacy auth token from a request. Prefers the `AUTHTOKEN`
 * header, falling back to a `Authorization: Bearer <token>` header. Empty/blank
 * values are treated as absent so they don't suppress the shared-token fallback
 * in downstream services.
 */
export function tokenFromRequest(req: Request): string | undefined {
  const authToken = req.header("AUTHTOKEN")?.trim();
  if (authToken) return authToken;
  const auth = req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }
  return undefined;
}
