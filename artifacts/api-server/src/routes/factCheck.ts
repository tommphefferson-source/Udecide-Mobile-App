import crypto from "node:crypto";
import { Router, type IRouter } from "express";

import { tokenFromRequest } from "../lib/requestToken";

const router: IRouter = Router();

// Server-side rate limit, mirroring the app's 10-questions-per-session cap so
// the limit can't be bypassed by calling the endpoint directly. Keyed by the
// user's AUTHTOKEN (hashed — no raw tokens held as map keys), falling back to
// the client IP for unauthenticated calls. In-memory sliding window, matching
// the single-process pattern used by googleOauth's pendingSessions.
const RATE_LIMIT = Number(process.env.FACT_CHECK_LIMIT ?? 10);
const RATE_WINDOW_MS = Number(process.env.FACT_CHECK_WINDOW_MINUTES ?? 15) * 60_000;
const requestLog = new Map<string, number[]>();

function rateLimitKey(req: Parameters<typeof tokenFromRequest>[0]): string {
  const token = tokenFromRequest(req);
  if (token) {
    return "t:" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
  }
  return "ip:" + (req.ip ?? "unknown");
}

/** Returns true when the caller is within the limit (and records the request). */
function allowRequest(key: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (requestLog.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT) {
    requestLog.set(key, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(key, recent);
  // Lazy sweep: drop stale entries so the map doesn't grow unbounded.
  if (requestLog.size > 10_000) {
    for (const [k, times] of requestLog) {
      if (times.every((t) => t <= cutoff)) requestLog.delete(k);
    }
  }
  return true;
}

// Server-only secret — never expose via an EXPO_PUBLIC_* name (that would bundle
// it into the public mobile-app build and let anyone extract it). Mirrors the
// CICERO_API_KEY pattern in routes/representatives.ts.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Overridable so the model can be changed without a code deploy.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// The nonpartisan system prompt lives here (server-side) rather than in the app
// bundle, so the Fact Checker's behavior is defined alongside the key it uses.
const SYSTEM_PROMPT = `You are a neutral, nonpartisan political information assistant for the UDecide app.
Your role is to help users understand U.S. politics, government processes, legislation, and elections.

Rules you must follow:
1. Remain strictly neutral and nonpartisan at all times
2. Do NOT endorse, favor, or criticize any candidate, political party, or policy
3. Do NOT give voting recommendations
4. Cite or reference sources when available
5. Clearly distinguish facts from claims or opinions
6. Say when you cannot verify something
7. Use simple, accessible language
8. When fact-checking, use the format:
   - Claim: [the claim]
   - Status: [Verified / Partially Verified / Not Enough Evidence / False or Misleading / Opinion - Cannot Be Fact-Checked]
   - Explanation: [neutral explanation]
   - Sources: [source references if applicable]
   - Date Checked: [today's date]

You are here to inform, not to persuade.`;

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Proxies Google Gemini (Generative Language API) for the Fact Checker.
 *
 * Keeping this server-side hides the Gemini API key from the mobile client — an
 * `EXPO_PUBLIC_GEMINI_API_KEY` would be baked into the shipped app and could be
 * extracted by anyone inspecting the bundle. This mirrors how the Cicero key is
 * handled by the /representatives proxy.
 *
 * Request body: `{ messages: [{ role: "user" | "model", content: string }] }`
 * Response `{ text, mock }`:
 *   - mock=true  → no key configured; a canned demo answer (feature still works)
 *   - mock=false → the live Gemini response
 */
router.post("/fact-check", async (req, res) => {
  if (!allowRequest(rateLimitKey(req))) {
    res.status(429).json({
      text: "",
      mock: false,
      error:
        "You've reached the Fact Checker limit for now. Please wait a few minutes and try again.",
    });
    return;
  }

  const body = req.body as { messages?: unknown };
  const messages: ChatMessage[] = (
    Array.isArray(body?.messages) ? body.messages : []
  )
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as { content?: unknown }).content === "string" &&
        ((m as { role?: unknown }).role === "user" ||
          (m as { role?: unknown }).role === "model"),
    )
    .map((m) => ({ role: m.role, content: m.content }));

  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  // No key → serve a demo response so the feature works in demos/dev.
  if (!GEMINI_API_KEY) {
    res.json({ text: generateMockResponse(lastUser?.content ?? ""), mock: true });
    return;
  }

  try {
    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      {
        role: "model",
        parts: [
          {
            text: "Understood. I will provide neutral, factual political information as requested.",
          },
        ],
      },
      ...messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    ];

    const upstream = await fetch(`${geminiUrl(GEMINI_MODEL)}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    });

    if (!upstream.ok) {
      let detail = "";
      try {
        detail = await upstream.text();
      } catch {
        /* ignore */
      }
      req.log.error({ status: upstream.status, detail }, "Gemini upstream error");
      // Don't leak the raw upstream body (may contain key/quota details).
      res.status(502).json({
        text: "",
        mock: false,
        error: "The AI service is temporarily unavailable. Please try again.",
      });
      return;
    }

    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    res.json({ text, mock: false });
  } catch (err) {
    req.log.error({ err }, "Gemini proxy failed");
    res.status(502).json({
      text: "",
      mock: false,
      error: "The AI service is temporarily unavailable. Please try again.",
    });
  }
});

/**
 * Keyword-matched demo answers used when no GEMINI_API_KEY is configured, so the
 * Fact Checker still responds in demos and local dev. (Moved here from the app.)
 */
function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("electoral college")) {
    return (
      "The Electoral College is the formal body that elects the President and Vice President. Each state receives electoral votes equal to its Congressional representation (House seats + 2 Senate seats), totaling 538 votes. A candidate needs 270 to win. In most states, the winner of the popular vote receives all electoral votes (winner-take-all). Maine and Nebraska use a proportional system by congressional district.\n\nSources: U.S. Constitution, Article II; 23rd Amendment\nDate Checked: " +
      new Date().toLocaleDateString()
    );
  }
  if (
    lower.includes("fact check") ||
    lower.includes("claim") ||
    lower.includes("true") ||
    lower.includes("false")
  ) {
    return "To fact-check a political claim, I need you to share the specific statement or claim you'd like me to evaluate.\n\nI will assess it using publicly available, nonpartisan sources and provide:\n• Claim summary\n• Verification status\n• Neutral explanation\n• Sources referenced\n• Date checked\n\nPlease share the specific claim you'd like me to review. Note: I do not have real-time internet access. For current events, please also consult fact-checking organizations like PolitiFact, FactCheck.org, or Snopes.";
  }
  if (
    lower.includes("bill") ||
    lower.includes("legislation") ||
    lower.includes("law")
  ) {
    return "To summarize legislation in plain language, please provide the bill number or name (e.g., 'H.R. 1234' or 'Inflation Reduction Act').\n\nFor any bill, I can help you understand:\n• What the bill proposes to do\n• Who sponsored it\n• What the key provisions are\n• Its current status in Congress\n• Nonpartisan analysis of potential effects\n\nNote: For real-time bill status and full text, visit Congress.gov or your state legislature's official website.";
  }
  if (
    lower.includes("representative") ||
    lower.includes("senator") ||
    lower.includes("voting record")
  ) {
    return "To look up a representative's voting record, I recommend:\n\n1. Congress.gov — Official record of all House and Senate votes\n2. GovTrack.us — Voting records with nonpartisan analysis\n3. VoteSmart.org — Comprehensive voting records and positions\n\nVoting records are public information and can be searched by representative's name, bill title, or vote date. I can help you interpret what a particular vote means or explain the legislation involved.";
  }

  return "Thank you for your question about U.S. politics and government. I'm UDecide's nonpartisan fact-checking assistant.\n\nI can help you:\n• Understand government processes and how laws are made\n• Summarize legislation in plain language\n• Explain political terms and concepts\n• Look up voting records and representative information\n• Fact-check political claims against public sources\n\nPlease note: I remain strictly neutral and do not endorse any candidate, party, or policy. For the most current information, always verify with official government sources.\n\nWhat would you like to know?";
}

export default router;
