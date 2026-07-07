import { env } from "../config/env";

export interface ForexRatesResponse {
  base: string;
  rates: Record<string, number>;
}

let cachedRates: Record<string, number> = {
  USD: 1.0825,
  INR: 90.35,
  AUD: 1.6312,
  NGN: 1625.5,
  VND: 27550.0,
  EUR: 1.0
};
let lastFetched = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

export async function getLiveForexRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - lastFetched < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const accessKey = "efbf202b8d003cb06708b776"; // From old server.ts hardcoded key
    const url = `https://v6.exchangerate-api.com/v6/${accessKey}/latest/EUR`;
    
    console.log("Fetching live exchange rates from ExchangeRate API...");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forex API responded with status ${response.status}`);
    }

    const data = await response.json() as any;
    if (data && data.conversion_rates) {
      cachedRates = {
        ...cachedRates,
        ...data.conversion_rates
      };
      lastFetched = now;
    }
  } catch (error: any) {
    console.warn("Failed to retrieve live forex rates; using in-memory cache fallback.", error.message);
  }

  return cachedRates;
}
export function getStaticRates() {
  return cachedRates;
}
