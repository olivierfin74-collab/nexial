import dotenv from "dotenv";

if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

console.log("SUPABASE_URL =", SUPABASE_URL ? "OK" : "MISSING");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!TWELVE_API_KEY) throw new Error("Missing TWELVE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_CHUNK_SIZE = 6;
const API_DELAY_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

function cleanPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value.toFixed(2));
}

function cleanTimestamp() {
  return new Date().toISOString().slice(0, 19);
}

async function getEnabledAssets() {
  const { data, error } = await supabase
    .from("assets_v1")
    .select("id, ticker, provider_symbol, currency")
    .eq("market_data_enabled", true)
    .order("ticker", { ascending: true });

  if (error) {
    throw new Error(`Assets fetch failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchPricesForSymbols(symbols) {
  const url = new URL("https://api.twelvedata.com/price");

  url.searchParams.set("symbol", symbols.join(","));
  url.searchParams.set("apikey", TWELVE_API_KEY);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Twelve Data HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json?.status === "error") {
    throw new Error(`Twelve Data API error: ${json.message ?? "unknown error"}`);
  }

  return json;
}

function extractPrice(rawData, symbol) {
  const value = rawData?.[symbol] ?? rawData;

  if (!value || value.price === undefined || value.price === null) {
    return null;
  }

  return cleanPrice(value.price);
}

async function insertPrices(rows) {
  if (rows.length === 0) {
    console.log("No valid prices to insert.");
    return;
  }

  const { error } = await supabase.from("price_quotes_v1").insert(rows);

  if (error) {
    throw new Error(`Insert prices failed: ${error.message}`);
  }

  console.log(`Prices inserted: ${rows.length}`);
}

async function main() {
  console.log("Starting market data update...");

  const assets = await getEnabledAssets();

  console.log(`Enabled assets: ${assets.length}`);

  if (assets.length === 0) {
    console.log("No enabled assets.");
    return;
  }

  const symbols = assets.map((asset) => asset.provider_symbol || asset.ticker);

  console.log(`Symbols requested: ${symbols.join(", ")}`);

  const chunks = chunkArray(symbols, API_CHUNK_SIZE);
  const rows = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    console.log(`Fetching chunk ${i + 1}/${chunks.length}: ${chunk.join(", ")}`);

    const rawData = await fetchPricesForSymbols(chunk);
    const quotedAt = cleanTimestamp();

    for (const asset of assets) {
      const symbol = asset.provider_symbol || asset.ticker;

      if (!chunk.includes(symbol)) continue;

      const price = extractPrice(rawData, symbol);

      if (!price) {
        console.log(`Skipped ${asset.ticker} (${symbol}): no valid price`);
        continue;
      }

      rows.push({
        asset_id: asset.id,
        price,
        currency: asset.currency ?? null,
        day_change_pct: null,
        day_change_amount: null,
        volume: null,
        source: "twelve_data",
        quoted_at: quotedAt,
      });
    }

    if (i < chunks.length - 1) {
      console.log(`Waiting ${API_DELAY_MS / 1000}s to avoid Twelve Data rate limit...`);
      await sleep(API_DELAY_MS);
    }
  }

  console.log(`Valid prices received: ${rows.length}`);

  await insertPrices(rows);

  console.log("Done.");
}

main().catch((error) => {
  console.error("Market data update failed:");
  console.error(error.message);
  process.exit(1);
});