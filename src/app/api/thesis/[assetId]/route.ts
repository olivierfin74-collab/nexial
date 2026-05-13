// Pass-through for thesis read / write on a position.
//
//   GET  → nx.fn_review_thesis_for_position
//   POST → nx.fn_set_position_thesis

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertDecisionalSchemaV2,
  type ConvictionLevel,
  type ThesisReviewPayload,
} from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function client() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", thesis: null },
        { status: 500 },
      );
    }

    const { assetId } = await params;
    if (!assetId) {
      return NextResponse.json(
        { error: "Missing assetId", thesis: null },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;

    const { data, error } = await client().rpc("fn_review_thesis_for_position", {
      p_asset_id: assetId,
      p_user_id: userId,
    });

    if (error) throw error;
    const thesis = (data as (ThesisReviewPayload & { schema_version?: unknown }) | null) ?? null;
    assertDecisionalSchemaV2(thesis);
    return NextResponse.json({ thesis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/thesis/[assetId]] GET error:", err);
    return NextResponse.json({ error: message, thesis: null }, { status: 500 });
  }
}

interface SetThesisBody {
  user_id?: string;
  conviction_level: ConvictionLevel;
  thesis_md?: string;
  exit_target_price?: number;
  exit_target_pnl_pct?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", result: null },
        { status: 500 },
      );
    }

    const { assetId } = await params;
    if (!assetId) {
      return NextResponse.json(
        { error: "Missing assetId", result: null },
        { status: 400 },
      );
    }

    const body = (await req.json()) as SetThesisBody;
    if (!body?.conviction_level) {
      return NextResponse.json(
        { error: "Missing conviction_level", result: null },
        { status: 400 },
      );
    }

    const userId = body.user_id || USER_ID_DEV;

    const { data, error } = await client().rpc("fn_set_position_thesis", {
      p_user_id: userId,
      p_asset_id: assetId,
      p_conviction_level: body.conviction_level,
      p_thesis_md: body.thesis_md ?? undefined,
      p_exit_target_price: body.exit_target_price ?? undefined,
      p_exit_target_pnl_pct: body.exit_target_pnl_pct ?? undefined,
    });

    if (error) throw error;
    const result = (data as { schema_version?: unknown } | null) ?? null;
    assertDecisionalSchemaV2(result);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/thesis/[assetId]] POST error:", err);
    return NextResponse.json({ error: message, result: null }, { status: 500 });
  }
}
