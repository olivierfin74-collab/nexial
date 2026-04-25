import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

// SECURITY CHECKS
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL in .env.local");
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
if (!TWELVE_API_KEY) throw new Error("Missing TWELVE_API_KEY in .env.local");

// INIT
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch enabled assets from DB
async function getEnabledAssets() {
  const { data, error } = await supabase
    .from("assets_v1")
    .select("id, ticker, provider_symbol, currency")
    .eq("market_data_enabled", true)
    .eq("market_data_provider", "twelve_data");

  if (error) {
    throw new Error(`Assets fetch error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("No enabled assets found in assets_v1");
  }

  return data;
}

// Build provider symbols from DB
function buildSymbols(assets) {
  return assets
    .map((asset) => asset.provider_symbol || asset.ticker)
    .filter(Boolean);
}

// Map provider_symbol -> asset
function buildAssetsMap(assets) {
  const map = {};

  for (const asset of assets) {
    const symbol = asset.provider_symbol || asset.ticker;

    if (!symbol) continue;

    map[symbol] = {
      id: asset.id,
      ticker: asset.ticker,
      provider_symbol: asset.provider_symbol,
      currency: asset.currency,
    };
  }

  return map;
}

// Fetch prices from Twelve Data
async function fetchPrices(symbols) {
  const url = new URL("https://api.twelvedata.com/price");

  url.searchParams.set("symbol", symbols.join(","));
  url.searchParams.set("apikey", TWELVE_API_KEY);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Twelve Data HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data) {
    throw new Error("No data returned from Twelve Data");
  }

  return data;
}

// Normalize Twelve Data response
function normalizePrices(rawData, assetsMap) {
  const now = new Date().toISOString();

  const rows = [];

  for (const [symbol, value] of Object.entries(rawData)) {
    const asset = assetsMap[symbol];

    if (!asset) {
      console.warn(`Skipped unknown symbol: ${symbol}`);
      continue;
    }

    if (value?.status === "error") {
      console.warn(`Skipped ${symbol}: ${value?.message || "Twelve Data error"}`);
      continue;
    }

    const price = Number.parseFloat(value?.price);

    if (!Number.isFinite(price)) {
      console.warn(`Skipped ${symbol}: invalid price`, value);
      continue;
    }

    rows.push({
      asset_id: asset.id,
      price,
      currency: asset.currency || null,
      day_change_pct: null,
      day_change_amount: null,
      volume: null,
      source: "twelve_data",
      quoted_at: now,
    });
  }

  return rows;
}

// Insert prices into DB
async function insertPrices(rows) {
  if (rows.length === 0) {
    console.log("No valid prices to insert.");
    return;
  }

  const { error } = await supabase.from("price_quotes_v1").insert(rows);

  if (error) {
    throw new Error(`Insert error: ${error.message}`);
  }

  console.log(`Prices inserted: ${rows.length}`);
}

// MAIN
async function main() {
  console.log("Starting market data update...");

  const assets = await getEnabledAssets();
  const symbols = buildSymbols(assets);
  const assetsMap = buildAssetsMap(assets);

  console.log(`Enabled assets: ${assets.length}`);
  console.log(`Symbols requested: ${symbols.join(", ")}`);

  const rawData = await fetchPrices(symbols);
  const rows = normalizePrices(rawData, assetsMap);

  console.log(`Valid prices received: ${rows.length}`);

  await insertPrices(rows);

  console.log("Done.");
}

main().catch((error) => {
  console.error("Market data update failed:");
  console.error(error.message);
  process.exit(1);
});