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

async function getAssets() {
  const { data, error } = await supabase
    .from("assets_v1")
    .select("id, ticker, provider_symbol, currency")
    .eq("market_data_enabled", true);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchPrices(symbols) {
  const url = `https://api.twelvedata.com/price?symbol=${symbols.join(",")}&apikey=${TWELVE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

async function insertPrices(assets, data) {
  const now = new Date().toISOString();

  const rows = assets.map(a => {
    const symbol = a.provider_symbol || a.ticker;
    const value = data[symbol] || data;

    if (!value?.price) return null;

    return {
      asset_id: a.id,
      price: Number(value.price),
      currency: a.currency,
      source: "twelve_data",
      quoted_at: now
    };
  }).filter(Boolean);

  if (rows.length === 0) {
    console.log("No prices to insert");
    return;
  }

  const { error } = await supabase
    .from("price_quotes_v1")
    .insert(rows);

  if (error) throw new Error(error.message);

  console.log("Prices inserted:", rows.length);
}

async function main() {
  console.log("Starting market data update...");

  const assets = await getAssets();
  const symbols = assets.map(a => a.provider_symbol || a.ticker);

  const data = await fetchPrices(symbols);

  await insertPrices(assets, data);

  console.log("Done.");
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});