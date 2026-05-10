import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountFilter = searchParams.get("account_id");
    const limit = Number(searchParams.get("limit") || 100);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const [positionsRes, summaryRes] = await Promise.all([
      supabase.rpc("fn_get_positions_for_user", {
        p_user_id: USER_ID_DEV,
        p_account_filter: accountFilter,
        p_limit: limit,
      }),
      supabase.rpc("fn_get_portfolio_summary_for_user", {
        p_user_id: USER_ID_DEV,
      }),
    ]);

    if (positionsRes.error) throw positionsRes.error;
    if (summaryRes.error) throw summaryRes.error;

    return NextResponse.json({
      positions: positionsRes.data || [],
      summary: summaryRes.data || null,
    });
  } catch (err: any) {
    console.error("[/api/portfolio/positions] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error", positions: [], summary: null },
      { status: 500 }
    );
  }
}
