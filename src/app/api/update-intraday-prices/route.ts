import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const tickers = ["NVDA", "AVGO", "META", "MSFT", "GOOGL", "AMZN", "TSM"];

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  console.log("SERVICE KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing env variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rows = [];

  for (const ticker of tickers) {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${ticker}&apikey=${apiKey}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data?.price) {
      rows.push({
        ticker,
        price: Number(data.price),
        ts: new Date().toISOString(),
        source: "TWELVE_DATA",
      });
    }
  }

  const { error } = await supabase
    .from("market_data_intraday")
    .insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    inserted: rows.length,
    rows,
  });
}