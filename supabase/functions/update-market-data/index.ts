import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing env vars" }, null, 2),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: assets, error: assetsError } = await supabase
      .from("assets_v1")
      .select("id, ticker, currency")
      .limit(5);

    if (assetsError || !assets) {
      return new Response(
        JSON.stringify(
          {
            error: "Failed to load assets",
            details: assetsError?.message ?? null,
          },
          null,
          2
        ),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (assets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No assets found" }, null, 2),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const results: Array<Record<string, unknown>> = [];

    for (const asset of assets) {
      try {
        const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
          asset.ticker
        )}&apikey=${apiKey}`;

        const response = await fetch(url);
        const json = await response.json();

        if (!json.price) {
          results.push({
            ticker: asset.ticker,
            status: "skipped",
            raw: json,
          });
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const price = Number(json.price);

        const { error: upsertError } = await supabase
          .from("market_data_daily")
          .upsert(
            {
              asset_id: asset.id,
              price_date: new Date().toISOString().slice(0, 10),
              close_price: price,
              currency: asset.currency,
            },
            {
              onConflict: "asset_id,price_date",
            }
          );

        results.push({
          ticker: asset.ticker,
          status: upsertError ? "error" : "updated",
          price,
          db_error: upsertError?.message ?? null,
        });

        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        results.push({
          ticker: asset.ticker,
          status: "error",
          db_error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify(
        {
          error: err instanceof Error ? err.message : "Unexpected error",
        },
        null,
        2
      ),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});