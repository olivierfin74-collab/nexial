import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type Asset = {
  id: string;
  ticker: string;
  name: string | null;
  provider_symbol: string;
  currency: string | null;
};

type WatchlistAsset = {
  ticker: string;
  asset_name: string | null;
  currency: string | null;
};

type ReferencePrice = {
  ticker: string;
  last_price: number | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWELVE_API_KEY = Deno.env.get("TWELVE_API_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TWELVE_API_KEY) {
  throw new Error("Missing required env vars");
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const MAX_DEVIATION_PCT = 30;
const REQUEST_DELAY_MS = 900;

const SYMBOL_MAP: Record<string, string> = {
  ASML: "ASML.AS",
  WPEA: "WPEA.PA",
  PANX: "PANX.PA",
  PLTR: "PLTR",
  ISRG: "ISRG",
  UBER: "UBER",
  AMZN: "AMZN",
  GOOGL: "GOOGL",
  NVDA: "NVDA",
  AMD: "AMD",
};

serve(async () => {
  const startedAt = new Date().toISOString();
  const assets = await fetchAllMarketAssets();
  const results = [];

  for (const asset of assets) {
    try {
      const quote = await fetchTwelveQuote(asset.provider_symbol);
      const attemptedPrice = quote.price;

      if (!attemptedPrice || !Number.isFinite(attemptedPrice) || attemptedPrice <= 0) {
        await logIngestion(asset, attemptedPrice, null, null, "REJECTED", "NO_VALID_PRICE", quote.raw);
        results.push({ ticker: asset.ticker, provider_symbol: asset.provider_symbol, status: "REJECTED", reason: "NO_VALID_PRICE" });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const referencePrice = await fetchReferencePrice(asset.ticker);
      const deviationPct = calculateDeviationPct(attemptedPrice, referencePrice);

      if (
        referencePrice !== null &&
        deviationPct !== null &&
        Math.abs(deviationPct) > MAX_DEVIATION_PCT
      ) {
        await logIngestion(
          asset,
          attemptedPrice,
          referencePrice,
          deviationPct,
          "REJECTED",
          "PRICE_DEVIATION_TOO_HIGH",
          quote.raw,
        );

        results.push({
          ticker: asset.ticker,
          provider_symbol: asset.provider_symbol,
          attempted_price: attemptedPrice,
          reference_price: referencePrice,
          deviation_pct: deviationPct,
          status: "REJECTED",
        });

        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      await insertMarketData(asset, attemptedPrice);
      await logIngestion(asset, attemptedPrice, referencePrice, deviationPct, "INSERTED", "OK", quote.raw);

      results.push({
        ticker: asset.ticker,
        provider_symbol: asset.provider_symbol,
        price: attemptedPrice,
        reference_price: referencePrice,
        deviation_pct: deviationPct,
        status: "INSERTED",
      });

      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      await logIngestion(
        asset,
        null,
        null,
        null,
        "ERROR",
        error instanceof Error ? error.message : String(error),
        null,
      );

      results.push({
        ticker: asset.ticker,
        provider_symbol: asset.provider_symbol,
        status: "ERROR",
        reason: error instanceof Error ? error.message : String(error),
      });

      await sleep(REQUEST_DELAY_MS);
    }
  }

  return jsonResponse({
    status: "DONE",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    assets_count: assets.length,
    results,
  });
});

async function fetchAllMarketAssets(): Promise<Asset[]> {
  const enabledAssets = await fetchEnabledAssets();
  const watchlistAssets = await fetchWatchlistAssets();

  const ensuredWatchlistAssets: Asset[] = [];

  for (const item of watchlistAssets) {
    const ticker = normalizeTicker(item.ticker);
    const providerSymbol = SYMBOL_MAP[ticker] || ticker;

    const existing = await fetchAssetByTicker(ticker);

    if (existing) {
      const updated = await enableAssetMarketData(existing, {
        name: item.asset_name,
        provider_symbol: providerSymbol,
        currency: item.currency,
      });

      ensuredWatchlistAssets.push(updated);
      continue;
    }

    const created = await createAssetFromWatchlist({
      ticker,
      name: item.asset_name,
      provider_symbol: providerSymbol,
      currency: item.currency,
    });

    ensuredWatchlistAssets.push(created);
  }

  const byTicker = new Map<string, Asset>();

  for (const asset of [...enabledAssets, ...ensuredWatchlistAssets]) {
    byTicker.set(normalizeTicker(asset.ticker), {
      ...asset,
      ticker: normalizeTicker(asset.ticker),
      provider_symbol: asset.provider_symbol || SYMBOL_MAP[normalizeTicker(asset.ticker)] || normalizeTicker(asset.ticker),
    });
  }

  return Array.from(byTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

async function fetchEnabledAssets(): Promise<Asset[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/assets_v1` +
    `?select=id,ticker,name,provider_symbol,currency` +
    `&market_data_enabled=eq.true` +
    `&market_data_provider=eq.twelve_data` +
    `&provider_symbol=not.is.null` +
    `&order=ticker.asc`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`fetchEnabledAssets failed: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

async function fetchWatchlistAssets(): Promise<WatchlistAsset[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/portfolio_watchlists` +
    `?select=ticker,asset_name,currency` +
    `&ticker=not.is.null` +
    `&order=ticker.asc`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`fetchWatchlistAssets failed: ${res.status} ${await res.text()}`);
  }

  const rows: WatchlistAsset[] = await res.json();
  const byTicker = new Map<string, WatchlistAsset>();

  for (const row of rows) {
    const ticker = normalizeTicker(row.ticker);
    if (!ticker) continue;

    byTicker.set(ticker, {
      ticker,
      asset_name: row.asset_name,
      currency: row.currency,
    });
  }

  return Array.from(byTicker.values());
}

async function fetchAssetByTicker(ticker: string): Promise<Asset | null> {
  const url =
    `${SUPABASE_URL}/rest/v1/assets_v1` +
    `?select=id,ticker,name,provider_symbol,currency` +
    `&ticker=eq.${encodeURIComponent(ticker)}` +
    `&limit=1`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`fetchAssetByTicker failed for ${ticker}: ${res.status} ${await res.text()}`);
  }

  const rows: Asset[] = await res.json();
  return rows[0] ?? null;
}

async function enableAssetMarketData(
  asset: Asset,
  patch: {
    name: string | null;
    provider_symbol: string;
    currency: string | null;
  },
): Promise<Asset> {
  const payload = {
    name: asset.name || patch.name,
    provider_symbol: asset.provider_symbol || patch.provider_symbol,
    currency: asset.currency || patch.currency || inferCurrency(asset.ticker),
    market_data_enabled: true,
    market_data_provider: "twelve_data",
  };

  const url =
    `${SUPABASE_URL}/rest/v1/assets_v1` +
    `?id=eq.${encodeURIComponent(asset.id)}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`enableAssetMarketData failed for ${asset.ticker}: ${res.status} ${await res.text()}`);
  }

  const rows: Asset[] = await res.json();

  return {
    id: rows[0]?.id ?? asset.id,
    ticker: normalizeTicker(rows[0]?.ticker ?? asset.ticker),
    name: rows[0]?.name ?? payload.name,
    provider_symbol: rows[0]?.provider_symbol ?? payload.provider_symbol,
    currency: rows[0]?.currency ?? payload.currency,
  };
}

async function createAssetFromWatchlist(asset: {
  ticker: string;
  name: string | null;
  provider_symbol: string;
  currency: string | null;
}): Promise<Asset> {
  const payload = {
    ticker: asset.ticker,
    name: asset.name,
    provider_symbol: asset.provider_symbol,
    currency: asset.currency || inferCurrency(asset.ticker),
    market_data_enabled: true,
    market_data_provider: "twelve_data",
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/assets_v1`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`createAssetFromWatchlist failed for ${asset.ticker}: ${res.status} ${await res.text()}`);
  }

  const rows: Asset[] = await res.json();
  const row = rows[0];

  if (!row?.id) {
    throw new Error(`createAssetFromWatchlist returned no id for ${asset.ticker}`);
  }

  return {
    id: row.id,
    ticker: normalizeTicker(row.ticker),
    name: row.name,
    provider_symbol: row.provider_symbol,
    currency: row.currency,
  };
}

async function fetchReferencePrice(ticker: string): Promise<number | null> {
  const url =
    `${SUPABASE_URL}/rest/v1/portfolio_positions_manual` +
    `?select=ticker,last_price` +
    `&ticker=eq.${encodeURIComponent(ticker)}` +
    `&last_price=not.is.null` +
    `&limit=1`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`fetchReferencePrice failed: ${res.status} ${await res.text()}`);
  }

  const rows: ReferencePrice[] = await res.json();
  const value = Number(rows?.[0]?.last_price);

  return Number.isFinite(value) && value > 0 ? value : null;
}

async function fetchTwelveQuote(symbol: string): Promise<{ price: number | null; raw: unknown }> {
  const url =
    `https://api.twelvedata.com/price` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&apikey=${TWELVE_API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Twelve Data HTTP error ${res.status}`);
  }

  if (json.status === "error") {
    return { price: null, raw: json };
  }

  const price = Number(json.price);

  return {
    price: Number.isFinite(price) ? price : null,
    raw: json,
  };
}

async function insertMarketData(asset: Asset, price: number) {
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    asset_id: asset.id,
    price_date: today,
    close_price: price,
    currency: asset.currency || inferCurrency(asset.ticker),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_data_daily`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `insertMarketData failed for ${asset.ticker}: ${res.status} ${await res.text()}`,
    );
  }
}

async function logIngestion(
  asset: Asset,
  attemptedPrice: number | null,
  referencePrice: number | null,
  deviationPct: number | null,
  status: string,
  reason: string,
  rawResponse: unknown,
) {
  const payload = {
    asset_id: asset.id,
    ticker: asset.ticker,
    provider_symbol: asset.provider_symbol,
    attempted_price: attemptedPrice,
    reference_price: referencePrice,
    deviation_pct: deviationPct,
    status,
    reason,
    provider: "twelve_data",
    raw_response: rawResponse ?? {},
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_data_ingestion_logs_v1`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`logIngestion failed for ${asset.ticker}: ${res.status} ${await res.text()}`);
  }
}

function calculateDeviationPct(price: number, reference: number | null): number | null {
  if (!reference || reference <= 0) return null;
  return Number((((price - reference) / reference) * 100).toFixed(2));
}

function normalizeTicker(ticker: string | null | undefined) {
  return String(ticker || "").trim().toUpperCase();
}

function inferCurrency(ticker: string) {
  const normalized = normalizeTicker(ticker);

  if (normalized === "WPEA" || normalized === "PANX" || normalized === "ASML") {
    return "EUR";
  }

  return "USD";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}