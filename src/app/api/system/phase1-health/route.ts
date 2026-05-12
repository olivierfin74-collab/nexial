import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type HealthStatus = "OK" | "WARN" | "ERROR";

type Check = {
  name: string;
  status: HealthStatus;
  message: string;
  freshness_hours?: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

function overall(checks: Check[]): HealthStatus {
  if (checks.some((check) => check.status === "ERROR")) return "ERROR";
  if (checks.some((check) => check.status === "WARN")) return "WARN";
  return "OK";
}

function hoursSince(value: unknown) {
  if (typeof value !== "string") return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round(((Date.now() - time) / 36e5) * 10) / 10);
}

async function tableCheck(name: string, table: string, timestampColumn = "created_at"): Promise<Check> {
  const { data, error } = await sb()
    .from(table)
    .select(timestampColumn)
    .order(timestampColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return { name, status: "ERROR", message: `${table} missing` };
    return { name, status: "ERROR", message: error.message };
  }

  if (!data) return { name, status: "WARN", message: `${table} empty`, freshness_hours: null };

  const row = data as unknown as Record<string, unknown>;
  const freshness = hoursSince(row[timestampColumn]);
  const status: HealthStatus = freshness == null ? "WARN" : freshness <= 24 ? "OK" : "WARN";
  return {
    name,
    status,
    message: freshness == null ? `${table} available, freshness unknown` : `${table} latest row ${freshness}h old`,
    freshness_hours: freshness,
  };
}

async function viewCheck(name: string, view: string): Promise<Check> {
  const { error } = await sb().from(view).select("*").limit(1);
  if (error) {
    if (error.code === "42P01") return { name, status: "ERROR", message: `${view} missing` };
    return { name, status: "ERROR", message: error.message };
  }
  return { name, status: "OK", message: `${view} available` };
}

export async function GET() {
  try {
    const checks = await Promise.all([
      tableCheck("flash_drop_api", "flash_drop_events", "detected_at"),
      tableCheck("ladder_api", "ladder_plans", "created_at"),
      tableCheck("market_regime_api", "market_regime_history", "detected_at"),
      viewCheck("opportunity_feed_dependencies", "vw_latest_market_regime"),
      viewCheck("flash_drop_alert_view", "vw_flash_drop_actionable_alerts"),
      viewCheck("ladder_view", "vw_ladder_plans_recent"),
    ]);

    return NextResponse.json({
      status: overall(checks),
      generated_at: new Date().toISOString(),
      checks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/system/phase1-health GET] error:", err);
    return NextResponse.json({
      status: "ERROR",
      generated_at: new Date().toISOString(),
      checks: [{ name: "phase1_health", status: "ERROR", message }],
    }, { status: 500 });
  }
}
