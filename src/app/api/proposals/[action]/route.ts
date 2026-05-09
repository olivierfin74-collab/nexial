import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  acceptSchema,
  modifySchema,
  cancelSchema,
} from "@/lib/schemas/proposals";

// Server-only Supabase client (service_role key, jamais exposée côté client)
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "nx" },
  });
};

// ═══════════════════════════════════════════════════════════════════
// Route handler unique pour les 3 actions (Next.js 16 dynamic route)
// ═══════════════════════════════════════════════════════════════════

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  if (!["accept", "modify", "cancel"].includes(action)) {
    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ACTION" },
      { status: 400 }
    );
  }

  // Garde auth : tout user authentifié peut appeler. L'ownership check
  // (proposal appartient bien à ce user) est fait côté DB dans les RPCs
  // via le paramètre p_user_id (RAISE EXCEPTION FORBIDDEN sinon).
  let authUserId: string;
  try {
    const userClient = await createServerClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }
    authUserId = user.id;
  } catch (err) {
    console.error("[/api/proposals/[action]] auth error:", err);
    return NextResponse.json(
      { ok: false, error: "AUTH_INTERNAL" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    if (action === "accept") {
      const parsed = acceptSchema.parse(body);
      const { data, error } = await supabase.rpc("fn_proposal_accept", {
        p_user_id: authUserId,
        p_proposal_ids: parsed.proposal_ids,
        p_action_metadata: parsed.action_metadata ?? {},
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: "RPC_ERROR", details: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    if (action === "modify") {
      const parsed = modifySchema.parse(body);
      const { data, error } = await supabase.rpc("fn_proposal_modify", {
        p_user_id: authUserId,
        p_proposal_id: parsed.proposal_id,
        p_patch: parsed.patch,
        p_action_metadata: parsed.action_metadata ?? {},
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: "RPC_ERROR", details: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    if (action === "cancel") {
      const parsed = cancelSchema.parse(body);
      const { data, error } = await supabase.rpc("fn_proposal_cancel", {
        p_user_id: authUserId,
        p_proposal_id: parsed.proposal_id,
        p_reason: parsed.reason ?? null,
        p_action_metadata: parsed.action_metadata ?? {},
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: "RPC_ERROR", details: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    // Unreachable, TypeScript safety
    return NextResponse.json(
      { ok: false, error: "UNREACHABLE" },
      { status: 500 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[/api/proposals/[action]] error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
