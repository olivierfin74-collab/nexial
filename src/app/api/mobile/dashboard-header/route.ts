// Pass-through to nx.fn_dashboard_header.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DashboardHeaderPayload } from "@/types/nexial-v3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Supabase environment missing" } },
        { status: 500 },
      );
    }
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_dashboard_header", {
      p_user_id: userId,
    });

    if (error) {
      console.error("[/api/mobile/dashboard-header] rpc error:", error);
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: error.message } },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: (data as DashboardHeaderPayload | null) ?? null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/mobile/dashboard-header] error:", err);
    return NextResponse.json(
      { data: null, error: { code: "fetch_failed", detail } },
      { status: 500 },
    );
  }
}
