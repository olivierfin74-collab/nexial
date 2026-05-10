import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

// GET /api/watchlists/[id]/items?limit=100
// Returns items via the unified RPC which routes by kind:
//   CONVICTION / DCA  -> stored items
//   OPPORTUNITY       -> dynamic from vw_signal_dashboard
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 100);

    const supabase = sb();
    const { data, error } = await supabase.rpc("fn_get_watchlist_payload_for_user", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: id,
      p_limit: limit,
    });
    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    console.error("[/api/watchlists/[id]/items GET] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error", items: [] },
      { status: 500 }
    );
  }
}

// POST /api/watchlists/[id]/items
// Body: { asset_id, priority?, notes?, move_if_exists? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.asset_id) {
      return NextResponse.json({ error: "asset_id required" }, { status: 400 });
    }

    const supabase = sb();
    const { data: itemId, error } = await supabase.rpc("fn_add_to_watchlist", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: id,
      p_asset_id: body.asset_id,
      p_priority: body.priority ?? 10,
      p_notes: body.notes ?? null,
      p_move_if_exists: body.move_if_exists !== false, // default true
    });
    if (error) throw error;

    return NextResponse.json({ item_id: itemId });
  } catch (err: any) {
    console.error("[/api/watchlists/[id]/items POST] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE /api/watchlists/[id]/items?asset_id=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("asset_id");
    if (!assetId) {
      return NextResponse.json({ error: "asset_id query param required" }, { status: 400 });
    }

    const supabase = sb();
    const { data: removed, error } = await supabase.rpc("fn_remove_from_watchlist", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: id,
      p_asset_id: assetId,
    });
    if (error) throw error;

    return NextResponse.json({ removed: removed === true });
  } catch (err: any) {
    console.error("[/api/watchlists/[id]/items DELETE] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
