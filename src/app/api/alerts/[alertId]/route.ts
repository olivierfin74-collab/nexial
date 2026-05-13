// Pass-through to nx.fn_alert_decision_v2 (detail of a single alert).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AlertDecisionPayload } from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", decision: null },
        { status: 500 },
      );
    }

    const { alertId } = await params;
    if (!alertId) {
      return NextResponse.json(
        { error: "Missing alertId", decision: null },
        { status: 400 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_alert_decision_v2", {
      p_alert_id: alertId,
    });

    if (error) throw error;
    return NextResponse.json({
      decision: (data as AlertDecisionPayload | null) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/alerts/[alertId]] error:", err);
    return NextResponse.json({ error: message, decision: null }, { status: 500 });
  }
}
