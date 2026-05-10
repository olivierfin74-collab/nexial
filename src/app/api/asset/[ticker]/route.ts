import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker", asset: null }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_get_asset_detail_for_user", {
      p_user_id: USER_ID_DEV,
      p_ticker: ticker.toUpperCase(),
    });

    if (error) throw error;

    return NextResponse.json({ asset: data || null });
  } catch (err: any) {
    console.error("[/api/asset/[ticker]] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error", asset: null },
      { status: 500 }
    );
  }
}
