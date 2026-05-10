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

// GET /api/watchlists — list user watchlists with metadata
export async function GET(_req: NextRequest) {
  try {
    const supabase = sb();
    const { data, error } = await supabase.rpc("fn_get_watchlists_for_user", {
      p_user_id: USER_ID_DEV,
    });
    if (error) throw error;
    return NextResponse.json({ watchlists: data || [] });
  } catch (err: any) {
    console.error("[/api/watchlists GET] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error", watchlists: [] },
      { status: 500 }
    );
  }
}

// POST /api/watchlists — create a new watchlist
// Body: { name, description?, account_id?, universe?, color?, icon?, kind? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = sb();

    // fn_create_watchlist returns the new uuid
    const { data: newId, error } = await supabase.rpc("fn_create_watchlist", {
      p_user_id: USER_ID_DEV,
      p_name: body.name,
      p_description: body.description ?? null,
      p_account_id: body.account_id ?? null,
      p_universe: body.universe ?? null,
      p_color: body.color ?? "#2D5F3F",
      p_icon: body.icon ?? null,
    });
    if (error) throw error;

    // If a non-default kind was requested, update it (fn_create doesn't take kind)
    if (body.kind && body.kind !== "CONVICTION") {
      const { error: upErr } = await supabase
        .from("watchlists")
        .update({ kind: body.kind })
        .eq("id", newId)
        .eq("user_id", USER_ID_DEV);
      if (upErr) throw upErr;
    }

    return NextResponse.json({ watchlist_id: newId });
  } catch (err: any) {
    console.error("[/api/watchlists POST] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

// PATCH /api/watchlists — reorder (body: { ordered_ids: uuid[] })
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.ordered_ids)) {
      return NextResponse.json({ error: "ordered_ids array required" }, { status: 400 });
    }
    const supabase = sb();
    const { error } = await supabase.rpc("fn_reorder_watchlists", {
      p_user_id: USER_ID_DEV,
      p_ordered_ids: body.ordered_ids,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/watchlists PATCH] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
