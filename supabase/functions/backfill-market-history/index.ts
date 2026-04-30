import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

console.log("BOOT OK - backfill-market-history");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TWELVE_API_KEY =
  Deno.env.get("TWELVE_DATA_API_KEY") ??
  Deno.env.get("TWELVE_API_KEY");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async () => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TWELVE_API_KEY) {
      return jsonResponse({
        status: "ERROR",
        reason: "MISSING_ENV",
        supabase_url: !!SUPABASE_URL,
        service_role_key: !!SERVICE_ROLE_KEY,
        twelve_api_key: !!TWELVE_API_KEY,
      }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: needed, error: neededError } = await supabase
      .from("vw_market_data_backfill_needed_v1")
      .select("ticker, asset_id, nb_points")
      .limit(1);

    if (neededError) {
      return jsonResponse({ status: "ERROR", step: "LOAD_NEEDED", error: neededError.message }, 500);
    }

    const target = needed?.[0];

    if (!target) {
      return jsonResponse({
        status: "DONE",
        reason: "NO_BACKFILL_NEEDED",
      });
    }

    const { data: assetRows, error: assetError } = await supabase
      .from("assets_v1")
      .select("ticker, provider_symbol, currency")
      .eq("ticker", target.ticker)
      .limit(1);

    if (assetError) {
      return jsonResponse({ status: "ERROR", step: "LOAD_ASSET", error: assetError.message }, 500);
    }

    const asset = assetRows?.[0];

    if (!asset?.provider_symbol) {
      return jsonResponse({
        status: "ERROR",
        step: "MISSING_PROVIDER_SYMBOL",
        ticker: target.ticker,
      }, 500);
    }

    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", asset.provider_symbol);
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", "30");
    url.searchParams.set("apikey", TWELVE_API_KEY);

    console.log(`[FETCH_HISTORY] ${target.ticker}`);

    const response = await fetch(url.toString());
    const text = await response.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return jsonResponse({
        status: "ERROR",
        step: "INVALID_JSON",
        raw: text,
      }, 500);
    }

    if (json?.status === "error") {
      return jsonResponse({
        status: "REJECTED",
        ticker: target.ticker,
        reason: json.message,
        raw: json,
      });
    }

    const values = json?.values ?? [];

    if (!Array.isArray(values) || values.length === 0) {
      return jsonResponse({
        status: "REJECTED",
        ticker: target.ticker,
        reason: "NO_HISTORY_VALUES",
        raw: json,
      });
    }

    const rows = values
      .map((v: any) => ({
        asset_id: target.asset_id,
        price_date: String(v.datetime).slice(0, 10),
        close_price: Number(v.close),
        currency: asset.currency,
        created_at: new Date().toISOString(),
      }))
      .filter((r: any) => Number.isFinite(r.close_price) && r.close_price > 0);

    let inserted = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const row of rows) {
      const { data: existing } = await supabase
        .from("market_data_daily")
        .select("id")
        .eq("asset_id", row.asset_id)
        .eq("price_date", row.price_date)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("market_data_daily")
        .insert(row);

      if (insertError) {
        errors.push({
          price_date: row.price_date,
          error: insertError.message,
        });
      } else {
        inserted++;
      }
    }

    return jsonResponse({
      status: "DONE",
      ticker: target.ticker,
      provider_symbol: asset.provider_symbol,
      previous_nb_points: target.nb_points,
      received: values.length,
      valid_rows: rows.length,
      inserted,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("[FATAL]", error);

    return jsonResponse({
      status: "FATAL_ERROR",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});