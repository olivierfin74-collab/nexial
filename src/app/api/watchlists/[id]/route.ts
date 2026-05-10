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

// PATCH /api/watchlists/[id] — update name/description/account/universe/color/icon
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const supabase = sb();
    const { error } = await supabase.rpc("fn_update_watchlist", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: id,
      p_name: body.name ?? null,
      p_description: body.description ?? null,
      p_account_id: body.account_id ?? null,
      p_universe: body.universe ?? null,
      p_color: body.color ?? null,
      p_icon: body.icon ?? null,
      p_clear_account: body.clear_account === true,
      p_clear_universe: body.clear_universe === true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/watchlists/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE /api/watchlists/[id]?hard=1 — soft delete by default
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";

    const supabase = sb();
    const { error } = await supabase.rpc("fn_delete_watchlist", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: id,
      p_hard: hard,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/watchlists/[id] DELETE] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
