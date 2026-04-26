import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!TWELVE_API_KEY) throw new Error("Missing TWELVE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getEnabledAssets() {
  const { data, error } = await supabase
    .from("assets_v1")
    .select("id, ticker, provider_symbol, currency")
    .eq("market_data_enabled", true)
    .eq("market_data_provider", "twelve_data");

  if (error) throw new Error(`Assets fetch failed: ${error.message}`);
  return data ?? [];
}

async function fetchPrices(symbols) {
  const url = `https://api.twelvedata.com/price?symbol=${symbols.join(",")}&apikey=${TWELVE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Twelve Data HTTP error: ${res.status}`);
  }

  return data;
}

async function insertPrices(assets, rawData) {
  const now = new Date().toISOString();

  const prices = [];

  for (const asset of assets) {
    const symbol = asset.provider_symbol || asset.ticker;
    const value = rawData[symbol] ?? rawData;

    if (!value?.price) {
      console.log(`Skipped ${symbol}: no valid price`);
      continue;
    }

    prices.push({
      asset_id: asset.id,
      price: Number(value.price),
      currency: asset.currency ?? null,
      day_change_pct: null,
      day_change_amount: null,
      volume: null,
      source: "twelve_data",
      quoted_at: now,
    });
  }

  if (prices.length === 0) {
    console.log("No valid prices to insert.");
    return;
  }

  const { error } = await supabase.from("price_quotes_v1").insert(prices);

  if (error) throw new Error(`Insert prices failed: ${error.message}`);

  console.log(`Prices inserted: ${prices.length}`);
}

async function main() {
  console.log("Starting market data update...");

  const assets = await getEnabledAssets();
  console.log(`Enabled assets: ${assets.length}`);

  const symbols = assets.map((a) => a.provider_symbol || a.ticker);
  console.log(`Symbols requested: ${symbols.join(", ")}`);

  if (symbols.length === 0) {
    console.log("No enabled assets.");
    return;
  }

  const rawData = await fetchPrices(symbols);

  const validCount = symbols.filter((s) => rawData[s]?.price || rawData.price).length;
  console.log(`Valid prices received: ${validCount}`);

  await insertPrices(assets, rawData);

  console.log("Done.");
}

main().catch((error) => {
  console.error("Market data update failed:");
  console.error(error.message);
  process.exit(1);
});