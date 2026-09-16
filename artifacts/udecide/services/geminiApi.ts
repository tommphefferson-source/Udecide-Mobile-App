import { apiFetch } from "./apiClient";
import { isSpanish, t } from "@/i18n";

export interface GeminiMessage {
  role: "user" | "model";
  content: string;
}

export interface GeminiResponse {
  text: string;
  error?: string;
  /** True when the server returned a canned demo answer (no key configured). */
  mock?: boolean;
}

/**
 * Sends the Fact Checker conversation to the API Server's `/fact-check` proxy,
 * which calls Google Gemini with a **server-side** key.
 *
 * The Gemini key is intentionally NOT bundled into the app (there is no
 * `EXPO_PUBLIC_GEMINI_API_KEY` anymore) — an inlined key would be extractable
 * from the shipped binary. When the server has no key configured, it responds
 * with a canned demo answer and `mock: true`, so the feature still works in
 * demos.
 *
 * `onChunk` is retained for API compatibility; the server replies with the full
 * text in one shot, so it's invoked once with the complete answer when provided.
 */
export async function sendGeminiMessage(
  messages: GeminiMessage[],
  onChunk?: (chunk: string) => void,
): Promise<GeminiResponse> {
  try {
    const res = await apiFetch("/fact-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // language: the server appends a "respond in Spanish" instruction to the
      // system prompt when the app is running in Spanish.
      body: JSON.stringify({ messages, language: isSpanish ? "es" : "en" }),
    });

    const data = (await res.json().catch(() => ({}))) as Partial<GeminiResponse>;

    if (!res.ok) {
      return {
        text: "",
        error:
          data.error ?? `${t("AI service error")} (${res.status}). ${t("Please try again.")}`,
      };
    }

    const text = data.text ?? "";
    if (onChunk && text) onChunk(text);
    return { text, mock: data.mock };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[FactCheck]", msg);
    return { text: "", error: t("The AI service is unavailable. Please try again.") };
  }
}
