import { MOCK_BILLS } from "./mockData";
import type { Bill } from "@/types/politics";

const API_KEY = process.env.EXPO_PUBLIC_LEGISCAN_API_KEY;
const BASE_URL = "https://api.legiscan.com/";

function isMockMode() {
  return !API_KEY;
}

export async function getMasterList(state: string): Promise<Bill[]> {
  if (isMockMode()) {
    console.warn("[LegiScan] No API key found - using mock data");
    await new Promise((resolve) => setTimeout(resolve, 600));
    return MOCK_BILLS.filter((b) => b.state === state || b.state === "US");
  }
  try {
    const res = await fetch(
      `${BASE_URL}?key=${API_KEY}&op=getMasterList&state=${state}`,
    );
    const data = await res.json();
    // A full session master list can contain thousands of bills; surface the
    // most recently acted-on ones (parity with the federal "recent bills" view).
    return mapLegiscanBills(data, state)
      .sort((a, b) => b.lastActionDate.localeCompare(a.lastActionDate))
      .slice(0, 50);
  } catch {
    return MOCK_BILLS.filter((b) => b.state === state || b.state === "US");
  }
}

export async function searchBills(
  query: string,
  state: string,
): Promise<Bill[]> {
  if (isMockMode()) {
    console.warn("[LegiScan] No API key found - using mock data");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const q = query.toLowerCase();
    return MOCK_BILLS.filter(
      (b) =>
        (b.state === state || b.state === "US" || state === "US") &&
        (b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)),
    );
  }
  try {
    const res = await fetch(
      `${BASE_URL}?key=${API_KEY}&op=getSearch&query=${encodeURIComponent(query)}&state=${state}`,
    );
    const data = await res.json();
    return mapLegiscanBills(data, state);
  } catch {
    return [];
  }
}

export async function getBill(billId: string): Promise<Bill | null> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_BILLS.find((b) => b.id === billId) ?? null;
  }
  try {
    const res = await fetch(
      `${BASE_URL}?key=${API_KEY}&op=getBill&id=${billId}`,
    );
    const data = await res.json();
    return mapSingleBill(data.bill);
  } catch {
    return null;
  }
}

// LegiScan numeric progress codes (used by getMasterList / getBill).
const STATUS_LABELS: Record<string, string> = {
  "0": "Prefiled",
  "1": "Introduced",
  "2": "Engrossed",
  "3": "Enrolled",
  "4": "Passed",
  "5": "Vetoed",
  "6": "Failed",
};

/**
 * Maps a LegiScan response into our Bill[] shape. Handles both container
 * shapes: `getMasterList` returns bills under `masterlist`, while `getSearch`
 * returns them under `searchresult`. Both also include a non-bill metadata
 * entry (`session` / `summary`) which is filtered out by checking for `bill_id`.
 */
function mapLegiscanBills(
  data: Record<string, unknown>,
  stateAbbr?: string,
): Bill[] {
  try {
    const container =
      ((data.masterlist ?? data.searchresult) as
        | Record<string, unknown>
        | undefined) ?? {};
    return Object.values(container)
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null &&
          "bill_id" in (item as object),
      )
      .map((item) => mapSingleBill(item, stateAbbr));
  } catch {
    return [];
  }
}

function mapSingleBill(
  bill: Record<string, unknown>,
  stateAbbr?: string,
): Bill {
  // masterlist uses `number`; getSearch/getBill use `bill_number`.
  const number = String(bill.number ?? bill.bill_number ?? "");
  // `status` is a numeric code in masterlist/getBill, a string elsewhere.
  const rawStatus = bill.status;
  const status =
    typeof rawStatus === "number"
      ? (STATUS_LABELS[String(rawStatus)] ?? `Status ${rawStatus}`)
      : String(rawStatus ?? "");

  return {
    id: String(bill.bill_id ?? ""),
    billId: number,
    number,
    title: String(bill.title ?? ""),
    description: String(bill.description ?? bill.title ?? ""),
    status,
    state: String(bill.state ?? stateAbbr ?? ""),
    session: String(bill.session ?? ""),
    lastAction: String(bill.last_action ?? ""),
    lastActionDate: String(bill.last_action_date ?? ""),
    sponsors: [],
    source: "LegiScan API",
  };
}
