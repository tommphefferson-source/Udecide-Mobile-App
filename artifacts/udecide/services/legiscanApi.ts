import { MOCK_BILLS } from "./mockData";
import type { Bill } from "@/types/politics";

const API_KEY = process.env.LEGISCAN_API_KEY;
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
      `${BASE_URL}?key=${API_KEY}&op=getMasterList&state=${state}`
    );
    const data = await res.json();
    return mapLegiscanBills(data);
  } catch {
    return MOCK_BILLS;
  }
}

export async function searchBills(query: string, state: string): Promise<Bill[]> {
  if (isMockMode()) {
    console.warn("[LegiScan] No API key found - using mock data");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const q = query.toLowerCase();
    return MOCK_BILLS.filter(
      (b) =>
        (b.state === state || b.state === "US" || state === "US") &&
        (b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q))
    );
  }
  try {
    const res = await fetch(
      `${BASE_URL}?key=${API_KEY}&op=getSearch&query=${encodeURIComponent(query)}&state=${state}`
    );
    const data = await res.json();
    return mapLegiscanBills(data);
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
    const res = await fetch(`${BASE_URL}?key=${API_KEY}&op=getBill&id=${billId}`);
    const data = await res.json();
    return mapSingleBill(data.bill);
  } catch {
    return null;
  }
}

function mapLegiscanBills(data: Record<string, unknown>): Bill[] {
  try {
    const results = (data as { searchresult?: Record<string, unknown> }).searchresult ?? {};
    return Object.values(results)
      .filter((item) => typeof item === "object" && item !== null && "bill_id" in (item as object))
      .map((item) => mapSingleBill(item as Record<string, unknown>))
      .filter(Boolean) as Bill[];
  } catch {
    return [];
  }
}

function mapSingleBill(bill: Record<string, unknown>): Bill {
  return {
    id: String(bill.bill_id ?? ""),
    billId: String(bill.bill_number ?? ""),
    number: String(bill.bill_number ?? ""),
    title: String(bill.title ?? ""),
    description: String(bill.description ?? ""),
    status: String(bill.status ?? ""),
    state: String(bill.state ?? ""),
    session: String(bill.session ?? ""),
    lastAction: String(bill.last_action ?? ""),
    lastActionDate: String(bill.last_action_date ?? ""),
    sponsors: [],
    source: "LegiScan API",
  };
}
