import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const API_KEY = Deno.env.get("TWELVE_DATA_API_KEY");
console.log("API KEY loaded:", API_KEY ? "YES" : "NO");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TICKERS = [
  "NVDA",
  "AVGO",
  "META",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSM"
];

serve(async () => {
  try {
    const results: any[] = [];

    for (const ticker of TICKERS) {
      const url = `https://api.twelvedata.com/price?symbol=${ticker}&apikey=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data?.price) {
        results.push({
          ticker: ticker,
          price: Number(data.price),
          ts: new Date().toISOString(),
          source: "TWELVE_DATA"
        });
      } else {
        console.log(`Erreur prix pour ${ticker}`, data);
      }
    }

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data fetched" }),
        { status: 500 }
      );
    }

    const insertResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_data_intraday`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY!,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(results)
      }
    );

    const insertData = await insertResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        inserted: results.length,
        data: insertData
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});