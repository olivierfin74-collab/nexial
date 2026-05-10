import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || 100);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data: orders, error: ordersError } = await supabase.rpc(
      "fn_get_active_orders_for_user",
      {
        p_user_id: USER_ID_DEV,
        p_status_filter: statusFilter,
        p_limit: limit,
      }
    );
    if (ordersError) throw ordersError;

    const { data: summary, error: summaryError } = await supabase.rpc(
      "fn_get_orders_summary_for_user",
      { p_user_id: USER_ID_DEV }
    );
    if (summaryError) throw summaryError;

    return NextResponse.json({
      orders: orders || [],
      summary: summary || { pending: 0, placed: 0, filled: 0, expired: 0, total: 0 },
    });
  } catch (err: any) {
    console.error("[/api/orders/active] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error", orders: [], summary: null },
      { status: 500 }
    );
  }
}
