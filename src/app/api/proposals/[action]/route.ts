import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Olivier — single-user personal tool. Toute action API doit venir de cet ID.
const OLIVIER_USER_ID = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

// Server-only Supabase client (service_role key, jamais exposée côté client)
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

// ═══════════════════════════════════════════════════════════════════
// Schemas Zod (validation server-side, ne JAMAIS faire confiance au front)
// ═══════════════════════════════════════════════════════════════════

const actionMetadataSchema = z
  .object({
    surface: z.enum(["mobile", "desktop"]),
    source_button_id: z.string().min(1).max(50),
    source_page: z.string().max(50).optional(),
  })
  .optional();

const acceptSchema = z.object({
  proposal_ids: z.array(z.string().uuid()).min(1).max(10),
  action_metadata: actionMetadataSchema,
});

const modifySchema = z.object({
  proposal_id: z.string().uuid(),
  patch: z
    .object({
      user_price: z.number().positive().optional(),
      user_quantity: z.number().positive().optional(),
      expires_at: z.string().datetime().optional(),
      user_note: z.string().max(500).optional(),
    })
    .refine(
      (d) => Object.keys(d).length > 0,
      "patch must have at least one field"
    ),
  action_metadata: actionMetadataSchema,
});

const cancelSchema = z.object({
  proposal_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
  action_metadata: actionMetadataSchema,
});

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

  // Garde auth : seul Olivier peut piloter ce endpoint
  let userId: string;
  try {
    const userClient = await createServerClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }
    if (user.id !== OLIVIER_USER_ID) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }
    userId = user.id;
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
        p_proposal_ids: parsed.proposal_ids,
        p_action_metadata: { ...(parsed.action_metadata ?? {}), user_id: userId },
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
        p_proposal_id: parsed.proposal_id,
        p_patch: parsed.patch,
        p_action_metadata: { ...(parsed.action_metadata ?? {}), user_id: userId },
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
        p_proposal_id: parsed.proposal_id,
        p_reason: parsed.reason ?? null,
        p_action_metadata: { ...(parsed.action_metadata ?? {}), user_id: userId },
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
