// Authentication is handled by the API Server, which proxies the legacy
// UDecide web service (/user_login, /user_sign_up) and returns a per-user
// auth token. Mirrors the API_BASE pattern used by the other services.
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  stateId: string;
  zipCode: string;
  phoneNumber: string;
  profileImage: string;
  status: string;
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
