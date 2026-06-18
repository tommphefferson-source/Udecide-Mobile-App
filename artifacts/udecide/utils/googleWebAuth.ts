import { Platform } from "react-native";

/**
 * "Sign in with Google" on web cannot use the native deep-link flow, and
 * `WebBrowser.openAuthSessionAsync` does not reliably deliver the result back to
 * an Expo-web app running inside an iframe (the canvas preview). Instead we open
 * the server-mediated OAuth flow in a real top-level popup window and pass the
 * result back to the opener via `postMessage`.
 *
 * The query marker the popup carries so it knows to forward its result and close
 * instead of booting the full app UI.
 */
export const GOOGLE_WEB_MARKER = "google_oauth";

/** The shape of the message the popup posts back to the opener window. */
export interface GoogleWebResult {
  type: "udecide-google-oauth";
  status?: string;
  code?: string;
  message?: string;
}

/**
 * Run inside the popup window: if this page was loaded as the Google OAuth
 * return target, forward the result params to the opener and close. Returns
 * `true` when it handled (and is closing) the popup so callers can skip booting
 * the rest of the app. No-op on native or in the normal (non-popup) app window.
 */
export function completeGoogleWebPopupIfNeeded(): boolean {
  if (Platform.OS !== "web") return false;
  if (typeof window === "undefined" || !window.opener) return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get(GOOGLE_WEB_MARKER) !== "1") return false;

  const result: GoogleWebResult = {
    type: "udecide-google-oauth",
    status: params.get("status") ?? undefined,
    code: params.get("code") ?? undefined,
    message: params.get("message") ?? undefined,
  };

  try {
    window.opener.postMessage(result, window.location.origin);
  } catch {
    // If we can't reach the opener there's nothing more we can do; closing the
    // window below still beats leaving a half-finished OAuth page open.
  }
  window.close();
  return true;
}

/**
 * Open the server-mediated Google flow in a popup and resolve with the result
 * the popup posts back. Resolves with `null` if the popup is blocked or the user
 * closes it before completing. Web-only.
 */
export function openGoogleWebPopup(
  buildStartUrl: (returnUri: string) => string,
): Promise<GoogleWebResult | null> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    const returnUri = `${origin}/?${GOOGLE_WEB_MARKER}=1`;
    const popup = window.open(
      buildStartUrl(returnUri),
      "udecide_google_oauth",
      "width=480,height=640,menubar=no,toolbar=no",
    );

    if (!popup) {
      resolve(null);
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
    };
    const finish = (value: GoogleWebResult | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      // Only trust messages from the popup we opened.
      if (event.source !== popup) return;
      const data = event.data as GoogleWebResult | undefined;
      if (!data || data.type !== "udecide-google-oauth") return;
      try {
        popup.close();
      } catch {
        // ignore
      }
      finish(data);
    };
    window.addEventListener("message", onMessage);

    // Detect the user dismissing the popup without finishing.
    const timer = setInterval(() => {
      if (popup.closed) finish(null);
    }, 500);
  });
}
