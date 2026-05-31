import { apiFetch } from "./apiClient";

// Static CMS pages (About Us, Privacy Policy, Terms & Conditions) are served by
// the API Server from the legacy `/static_pages` endpoint, keyed by a page code.
// These are public, but we still route through apiFetch for a consistent base
// URL and error handling.

/** Legacy CMS page codes backing the Support section links. */
export const STATIC_PAGE_CODES = {
  about: "aboutus",
  privacy: "privacypolicy",
  terms: "termsconditions",
} as const;

export interface StaticPage {
  title: string;
  contentHtml: string;
}

export async function fetchStaticPage(code: string): Promise<StaticPage> {
  const res = await apiFetch(`/pages/${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`Failed to load page (${res.status})`);
  }
  return (await res.json()) as StaticPage;
}
