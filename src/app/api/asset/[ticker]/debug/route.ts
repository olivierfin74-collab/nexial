import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Metadata = Record<string, unknown>;

function hasAdminAccess(metadata: Metadata | undefined) {
  return (
    metadata?.role === "admin" ||
    metadata?.user_role === "admin" ||
    metadata?.is_admin === true
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const normalizedTicker = ticker?.trim().toUpperCase();

    if (!normalizedTicker) {
      return NextResponse.json({ error: "Missing ticker", debug: null }, { status: 400 });
    }

    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Authentication required", debug: null }, { status: 401 });
    }

    if (!SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment missing", debug: null }, { status: 500 });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required", debug: null }, { status: 401 });
    }

    const appMetadata = user.app_metadata as Metadata | undefined;
    const userMetadata = user.user_metadata as Metadata | undefined;
    const isAdmin = hasAdminAccess(appMetadata) || hasAdminAccess(userMetadata);

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required", debug: null }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_quick_asset_lookup", {
      p_ticker: normalizedTicker,
    });

    if (error) throw error;

    return NextResponse.json({ debug: data || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/asset/[ticker]/debug] error:", err);
    return NextResponse.json({ error: message, debug: null }, { status: 500 });
  }
}
