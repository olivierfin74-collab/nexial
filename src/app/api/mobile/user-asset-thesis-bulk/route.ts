import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const MAX_ASSET_IDS = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ThesisRow = {
  asset_id?: string | null;
  conviction_level?: string | null;
  thesis_md?: string | null;
  context_fr?: string | null;
  [key: string]: unknown;
};

type ThesisBulkBody = {
  userId?: unknown;
  assetIds?: unknown;
};

type ThesisBulkError =
  | "AUTH_INTERNAL"
  | "EMPTY_ASSET_IDS"
  | "INVALID_ASSET_IDS"
  | "INVALID_JSON"
  | "INVALID_USER_ID"
  | "RPC_ERROR"
  | "TOO_MANY_ASSET_IDS"
  | "UNAUTHENTICATED"
  | "USER_MISMATCH"
  | "INTERNAL";

type ThesisBulkResponse = {
  theses: Record<string, ThesisRow>;
  count: number;
  error?: ThesisBulkError;
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

function json(body: ThesisBulkResponse, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

function empty(error: ThesisBulkError, status: number) {
  return json({ theses: {}, count: 0, error }, { status });
}

function parseUserId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const userId = value.trim();
  return UUID_RE.test(userId) ? userId : null;
}

function parseAssetIds(value: unknown):
  | { ok: true; assetIds: string[] }
  | { ok: false; error: "EMPTY_ASSET_IDS" | "INVALID_ASSET_IDS" | "TOO_MANY_ASSET_IDS" } {
  if (!Array.isArray(value)) return { ok: false, error: "INVALID_ASSET_IDS" };
  if (value.length === 0) return { ok: false, error: "EMPTY_ASSET_IDS" };
  if (value.length > MAX_ASSET_IDS) return { ok: false, error: "TOO_MANY_ASSET_IDS" };

  const assetIds = Array.from(new Set(value.map((id) => (typeof id === "string" ? id.trim() : ""))));
  if (assetIds.length === 0) return { ok: false, error: "EMPTY_ASSET_IDS" };
  if (assetIds.some((id) => !UUID_RE.test(id))) return { ok: false, error: "INVALID_ASSET_IDS" };

  return { ok: true, assetIds };
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
  let body: ThesisBulkBody;
  try {
    body = await request.json();
  } catch {
    return empty("INVALID_JSON", 400);
  }

  const requestedUserId = parseUserId(body.userId);
  if (body.userId != null && !requestedUserId) {
    return empty("INVALID_USER_ID", 400);
  }

  const parsedAssetIds = parseAssetIds(body.assetIds);
  if (!parsedAssetIds.ok) {
    return empty(parsedAssetIds.error, 400);
  }

  let userId = requestedUserId;
  try {
    const userClient = await createServerClient();
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error) {
      return empty("UNAUTHENTICATED", 401);
    }
    if (user) {
      if (requestedUserId && requestedUserId !== user.id) {
        return empty("USER_MISMATCH", 403);
      }
      userId = user.id;
    }
  } catch (err) {
    console.error("[/api/mobile/user-asset-thesis-bulk] auth error:", err);
    return empty("AUTH_INTERNAL", 500);
  }

  if (!userId) {
    return empty("UNAUTHENTICATED", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("fn_user_asset_thesis_bulk", {
      p_user_id: userId,
      p_asset_ids: parsedAssetIds.assetIds,
    });
    if (error) {
      console.error("[/api/mobile/user-asset-thesis-bulk] rpc error:", error);
      return empty("RPC_ERROR", 502);
    }

    const theses = normalizeRows(data).reduce<Record<string, ThesisRow>>((acc, row) => {
      if (typeof row.asset_id === "string" && row.asset_id) {
        acc[row.asset_id] = row;
      }
      return acc;
    }, {});

    // Stable mobile contract:
    // success: { theses: Record<assetId, thesis>, count }
    // failure: { theses: {}, count: 0, error }
    // The route validates transport shape only and does not infer strategy.
    return json({ theses, count: Object.keys(theses).length });
  } catch (err) {
    console.error("[/api/mobile/user-asset-thesis-bulk] error:", err);
    return empty("INTERNAL", 500);
  }
}
