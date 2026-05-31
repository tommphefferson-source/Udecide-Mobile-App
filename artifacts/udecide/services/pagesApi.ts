import { apiFetch } from "./apiClient";

// Legacy backend-managed static/legal pages.
//
// About Us, Privacy Policy and Terms & Conditions are NOT hardcoded in the app.
// Their content is authored/managed on the legacy backend and served by the
// legacy `POST /static_pages` endpoint, keyed by a `page_code` form field. The
// API Server proxies that endpoint; we route through apiFetch for a consistent
// base URL and error handling. The backend returns `page_title` / `page_content`
// (the API Server maps these to `title` / `contentHtml`); `contentHtml` may be
// HTML/rich text, which the page viewer renders.
//
// Contact Us is intentionally NOT here — it is email-based (mailto:), not an API
// call (see SUPPORT_EMAIL in utils/constants and the Support section in
// app/profile.tsx).

/** The exact legacy `page_code` values accepted by `/static_pages`. */
export const STATIC_PAGE_CODES = {
  about: "aboutus",
  privacy: "privacypolicy",
  terms: "termsconditions",
} as const;

export type StaticPageCode =
  (typeof STATIC_PAGE_CODES)[keyof typeof STATIC_PAGE_CODES];

/**
 * Map a friendly page slug to the legacy `page_code`. Mirrors the legacy app's
 * mapping table and accepts the alias forms used across the UI:
 *   about | about-us            → aboutus
 *   privacy | privacy-policy    → privacypolicy
 *   terms | terms-and-conditions → termsconditions
 * Already-canonical legacy codes pass through unchanged.
 */
export function resolvePageCode(slug: string): StaticPageCode | null {
  switch (slug.trim().toLowerCase()) {
    case "about":
    case "about-us":
    case "aboutus":
      return STATIC_PAGE_CODES.about;
    case "privacy":
    case "privacy-policy":
    case "privacypolicy":
      return STATIC_PAGE_CODES.privacy;
    case "terms":
    case "terms-and-conditions":
    case "termsconditions":
      return STATIC_PAGE_CODES.terms;
    default:
      return null;
  }
}

export interface StaticPage {
  /** Backend `page_title`. */
  title: string;
  /** Backend `page_content` — may contain HTML/rich text. */
  contentHtml: string;
}

/**
 * Reusable API method for the legacy `POST /static_pages` endpoint. Accepts a
 * legacy `page_code` (e.g. `aboutus`) or a friendly slug (e.g. `about-us`),
 * resolving the latter to the canonical code first.
 */
export async function getStaticPage(pageCode: string): Promise<StaticPage> {
  const code = resolvePageCode(pageCode) ?? pageCode;
  const res = await apiFetch(`/pages/${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`Failed to load page (${res.status})`);
  }
  return (await res.json()) as StaticPage;
}

/** Page-specific loaders for the legacy backend-managed static pages. */
export const getAboutUs = (): Promise<StaticPage> =>
  getStaticPage(STATIC_PAGE_CODES.about);
export const getPrivacyPolicy = (): Promise<StaticPage> =>
  getStaticPage(STATIC_PAGE_CODES.privacy);
export const getTermsAndConditions = (): Promise<StaticPage> =>
  getStaticPage(STATIC_PAGE_CODES.terms);

/** @deprecated Use {@link getStaticPage}. Kept for existing callers. */
export const fetchStaticPage = getStaticPage;
