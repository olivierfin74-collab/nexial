import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

async function readView(table: string, limit = 200) {
  const { data, error } = await sb().from(table).select("*").limit(limit);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return data || [];
}

export async function GET() {
  try {
    const [decisions, monthlyRecap, cioPerformance, alertSummary] = await Promise.all([
      readView("vw_olivier_decisions_history", 300),
      readView("vw_monthly_recap", 12),
      readView("vw_cio_recommendations_performance", 100),
      readView("vw_alert_intelligence_summary", 100),
    ]);

    return NextResponse.json({
      decisions,
      monthlyRecap,
      cioPerformance,
      alertSummary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/performance] error:", err);
    return NextResponse.json(
      { error: message, decisions: [], monthlyRecap: [], cioPerformance: [], alertSummary: [] },
      { status: 500 },
    );
  }
}
