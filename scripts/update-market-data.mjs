import dotenv from "dotenv";

if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

const API_DELAY_MS = 8500;

console.log("SUPABASE_URL =", SUPABASE_URL ? "OK" : "MISSING");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!TWELVE_API_KEY) throw new Error("Missing TWELVE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanPrice(value) {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return Number(price.toFixed(2));
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

async function fetchSinglePrice(symbol) {
  const url = new URL("https://api.twelvedata.com/price");

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", TWELVE_API_KEY);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Twelve Data HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json?.status === "error") {
    throw new Error(json.message ?? "Twelve Data API error");
  }

  const price = cleanPrice(json?.price);

  if (!price) {
    throw new Error("Invalid or missing price");
  }

  return price;
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

  const rows = [];

  for (let i = 0; i < assets.length; i += 1) {
    const asset = assets[i];
    const symbol = asset.provider_symbol || asset.ticker;

    console.log(`Fetching ${i + 1}/${assets.length}: ${asset.ticker} (${symbol})`);

    try {
      const price = await fetchSinglePrice(symbol);

      rows.push({
        asset_id: asset.id,
        price,
        currency: asset.currency ?? null,
        day_change_pct: null,
        day_change_amount: null,
        volume: null,
        source: "twelve_data",
        quoted_at: cleanTimestamp(),
      });

      console.log(`✔ ${asset.ticker} = ${price}`);
    } catch (error) {
      console.log(`❌ ${asset.ticker} (${symbol}) failed: ${error.message}`);
    }

    if (i < assets.length - 1) {
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