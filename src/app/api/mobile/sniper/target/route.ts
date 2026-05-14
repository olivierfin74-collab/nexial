// Pass-through for sniper price-target create / update.
// User-driven only — never invoked automatically.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { MutationResult } from "@/types/nexial-v3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

interface CreateBody {
  asset_id: string;
  target_price: number;
  target_quantity?: number;
  target_amount_eur?: number;
  zone_label?: string;
  thesis_md?: string;
  user_id?: string;
}

interface UpdateBody {
  sniper_id: string;
  target_price?: number;
  target_quantity?: number;
  target_amount_eur?: number;
  zone_label?: string;
  thesis_md?: string;
  user_id?: string;
}

function client() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Supabase environment missing" } },
        { status: 500 },
      );
    }

    const body = (await req.json()) as CreateBody;
    if (!body?.asset_id || typeof body.target_price !== "number" || !Number.isFinite(body.target_price)) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Missing asset_id or target_price" } },
        { status: 400 },
      );
    }

    const { data, error } = await client().rpc("fn_sniper_create_target", {
      p_asset_id: body.asset_id,
      p_target_price: body.target_price,
      p_target_quantity: body.target_quantity ?? undefined,
      p_target_amount_eur: body.target_amount_eur ?? undefined,
      p_zone_label: body.zone_label ?? "Z2",
      p_thesis_md: body.thesis_md ?? undefined,
      p_user_id: body.user_id ?? USER_ID_DEV,
    });

    if (error) {
      console.error("[/api/mobile/sniper/target POST] rpc error:", error);
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: error.message } },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: (data as MutationResult | null) ?? null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/mobile/sniper/target POST] error:", err);
    return NextResponse.json(
      { data: null, error: { code: "fetch_failed", detail } },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Supabase environment missing" } },
        { status: 500 },
      );
    }

    const body = (await req.json()) as UpdateBody;
    if (!body?.sniper_id) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Missing sniper_id" } },
        { status: 400 },
      );
    }

    const { data, error } = await client().rpc("fn_sniper_update_target", {
      p_sniper_id: body.sniper_id,
      p_target_price: body.target_price ?? undefined,
      p_target_quantity: body.target_quantity ?? undefined,
      p_target_amount_eur: body.target_amount_eur ?? undefined,
      p_zone_label: body.zone_label ?? undefined,
      p_thesis_md: body.thesis_md ?? undefined,
      p_user_id: body.user_id ?? USER_ID_DEV,
    });

    if (error) {
      console.error("[/api/mobile/sniper/target PATCH] rpc error:", error);
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: error.message } },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: (data as MutationResult | null) ?? null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/mobile/sniper/target PATCH] error:", err);
    return NextResponse.json(
      { data: null, error: { code: "fetch_failed", detail } },
      { status: 500 },
    );
  }
}
