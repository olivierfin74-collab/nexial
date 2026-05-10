/**
 * Twelve Data symbol search provider.
 *
 * Single responsibility: take a free-text query, return normalized
 * asset candidates from Twelve Data's symbol_search endpoint.
 *
 * Note: when migrating to EODHD (~25 mai 2026), create a new file
 * `eodhdSearch.ts` with the same exported signature, then swap the
 * import in `/api/assets/search/route.ts`. No other change needed.
 */

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_BASE = "https://api.twelvedata.com";

export type ExternalAssetResult = {
  ticker: string;
  exchange_mic: string | null;
  asset_name: string;
  currency: string | null;
  exchange_region: string | null;
  asset_class: string;
  country: string | null;
  data_source: "twelve_data";
  data_source_symbol: string;
  is_in_db: false;
  match_score: number;
};

type TwelveDataSearchHit = {
  symbol: string;
  instrument_name?: string;
  exchange?: string;
  mic_code?: string;
  exchange_timezone?: string;
  instrument_type?: string;
  country?: string;
  currency?: string;
};

const REGION_BY_COUNTRY: Record<string, string> = {
  "United States": "us",
  "France": "eu",
  "Germany": "eu",
  "Netherlands": "eu",
  "Italy": "eu",
  "Spain": "eu",
  "Belgium": "eu",
  "Portugal": "eu",
  "Ireland": "eu",
  "Finland": "eu",
  "Sweden": "eu",
  "Denmark": "eu",
  "Norway": "eu",
  "Austria": "eu",
  "Switzerland": "eu",
  "United Kingdom": "uk",
  "Japan": "jp",
};

const CLASS_BY_TYPE: Record<string, string> = {
  "Common Stock": "equity",
  "Equity": "equity",
  "ETF": "etf",
  "Mutual Fund": "etf",
  "Digital Currency": "crypto",
  "Cryptocurrency": "crypto",
  "Index": "equity",
};

function normalize(hit: TwelveDataSearchHit, query: string): ExternalAssetResult {
  const region = (hit.country && REGION_BY_COUNTRY[hit.country]) || "us";
  const assetClass = (hit.instrument_type && CLASS_BY_TYPE[hit.instrument_type]) || "equity";

  // Match score: exact ticker > startswith > name match
  const q = query.toLowerCase();
  const sym = (hit.symbol || "").toLowerCase();
  const name = (hit.instrument_name || "").toLowerCase();
  let score = 0.2;
  if (sym === q) score = 0.95;
  else if (sym.startsWith(q)) score = 0.75;
  else if (name.includes(q)) score = 0.45;

  return {
    ticker: hit.symbol,
    exchange_mic: hit.mic_code || null,
    asset_name: hit.instrument_name || hit.symbol,
    currency: hit.currency || null,
    exchange_region: region,
    asset_class: assetClass,
    country: hit.country || null,
    data_source: "twelve_data",
    data_source_symbol: hit.symbol,
    is_in_db: false,
    match_score: score,
  };
}

/**
 * Search the Twelve Data symbol catalog.
 * Returns up to `limit` normalized candidates, or empty array on error.
 * Never throws: failures are logged and degraded silently so the
 * internal search results still reach the user.
 */
export async function searchExternalAssets(
  query: string,
  limit = 10
): Promise<ExternalAssetResult[]> {
  if (!TWELVE_DATA_API_KEY) {
    console.warn("[twelveDataSearch] TWELVE_DATA_API_KEY not set, skipping external search");
    return [];
  }
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const url = new URL(`${TWELVE_DATA_BASE}/symbol_search`);
    url.searchParams.set("symbol", query.trim());
    url.searchParams.set("outputsize", String(limit));
    url.searchParams.set("apikey", TWELVE_DATA_API_KEY);

    const res = await fetch(url.toString(), {
      method: "GET",
      // Twelve Data is fast (<300ms typical). 5s safety timeout.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[twelveDataSearch] HTTP ${res.status} for query="${query}"`);
      return [];
    }

    const json = await res.json();
    const hits: TwelveDataSearchHit[] = Array.isArray(json?.data) ? json.data : [];

    return hits
      .filter((h) => h.symbol)
      .map((h) => normalize(h, query))
      // Stable sort: higher match_score first
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);
  } catch (err) {
    console.warn("[twelveDataSearch] error:", err);
    return [];
  }
}
