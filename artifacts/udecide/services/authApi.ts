// Authentication is handled by the API Server, which proxies the legacy
// UDecide web service (/user_login, /user_sign_up) and returns a per-user
// auth token. Mirrors the API_BASE pattern used by the other services.
import { apiFetch } from "./apiClient";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  stateId: string;
  zipCode: string;
  phoneNumber: string;
  profileImage: string;
  status: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  /** 2-letter US state abbreviation. */
  state?: string;
  zipCode?: string;
  phone?: string;
}

export interface AuthResult {
  authToken: string;
  user: AuthUser;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  stateId: string;
  city: string;
  zipCode: string;
  phone?: string;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // fall through to status-based message
  }
  return `Request failed (${res.status})`;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}

/**
 * Build the URL that kicks off the server-mediated Google OAuth flow. The app
 * opens this in an in-app browser; the server handles the Google handshake and
 * redirects back to `returnUri` with a one-time `code` (or an `error`).
 */
export function googleStartUrl(returnUri: string): string {
  return `${API_BASE}/auth/google/start?return_uri=${encodeURIComponent(returnUri)}`;
}

/**
 * Redeem the one-time code returned on `returnUri` for an authenticated
 * session. The code is single-use and short-lived.
 */
export async function exchangeGoogleCode(code: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}

export async function signup(input: SignUpInput): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}

/**
 * Persist a profile update to the backend (which proxies the legacy
 * `/edit_profile`). Authenticated: the AUTHTOKEN header is attached by
 * `apiFetch`, which also clears the session and routes to login on a 401.
 */
export async function updateProfile(input: ProfileUpdateInput): Promise<AuthResult> {
  const res = await apiFetch("/auth/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}

export interface ProfilePhotoFile {
  /** Local file URI from the image picker. */
  uri: string;
  /** Filename sent to the backend (e.g. "profile.jpg"). */
  name: string;
  /** MIME type (e.g. "image/jpeg"). */
  type: string;
}

/**
 * Upload a new profile photo. Sent as multipart/form-data under the `photo`
 * field; the API Server forwards it to the legacy backend and returns the
 * updated user (with the stored photo URL). The Content-Type/boundary is set
 * automatically from the FormData body — do NOT set it manually.
 */
export async function uploadProfilePhoto(file: ProfilePhotoFile): Promise<AuthResult> {
  const form = new FormData();
  // React Native's FormData accepts a { uri, name, type } object for file parts.
  form.append("photo", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const res = await apiFetch("/auth/profile/photo", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}
