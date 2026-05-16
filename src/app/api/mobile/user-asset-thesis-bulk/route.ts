import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type ThesisRow = {
  asset_id?: string | null;
  conviction_level?: string | null;
  thesis_md?: string | null;
  context_fr?: string | null;
  [key: string]: unknown;
};

type ThesisBulkBody = {
  assetIds?: unknown;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "nx" },
  });
}

function cleanAssetIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);
}

function normalizeRows(data: unknown): ThesisRow[] {
  if (Array.isArray(data)) return data.filter((row): row is ThesisRow => !!row && typeof row === "object");
  if (data && typeof data === "object") {
    const maybeRows = (data as { theses?: unknown; rows?: unknown; data?: unknown }).theses
      ?? (data as { rows?: unknown }).rows
      ?? (data as { data?: unknown }).data;
    if (Array.isArray(maybeRows)) {
      return maybeRows.filter((row): row is ThesisRow => !!row && typeof row === "object");
    }
  }
  return [];
}

export async function POST(request: Request) {
  let userId: string;
  try {
    const userClient = await createServerClient();
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) {
      return NextResponse.json(
        { theses: {}, count: 0, error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }
    userId = user.id;
  } catch (err) {
    console.error("[/api/mobile/user-asset-thesis-bulk] auth error:", err);
    return NextResponse.json(
      { theses: {}, count: 0, error: "AUTH_INTERNAL" },
      { status: 500 },
    );
  }

  let body: ThesisBulkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { theses: {}, count: 0, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const assetIds = cleanAssetIds(body.assetIds);
  if (assetIds.length === 0) {
    return NextResponse.json({ theses: {}, count: 0 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("fn_user_asset_thesis_bulk", {
      p_user_id: userId,
      p_asset_ids: assetIds,
    });
    if (error) {
      console.error("[/api/mobile/user-asset-thesis-bulk] rpc error:", error);
      return NextResponse.json(
        { theses: {}, count: 0, error: "RPC_ERROR" },
        { status: 502 },
      );
    }

    const theses = normalizeRows(data).reduce<Record<string, ThesisRow>>((acc, row) => {
      if (typeof row.asset_id === "string" && row.asset_id) {
        acc[row.asset_id] = row;
      }
      return acc;
    }, {});

    return NextResponse.json({ theses, count: Object.keys(theses).length });
  } catch (err) {
    console.error("[/api/mobile/user-asset-thesis-bulk] error:", err);
    return NextResponse.json(
      { theses: {}, count: 0, error: "INTERNAL" },
      { status: 500 },
    );
  }
}
