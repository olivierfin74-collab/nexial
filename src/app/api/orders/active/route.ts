import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

type LifecycleOrder = {
  status?: string | null;
  status_fr?: string | null;
};

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(value: unknown, field: string) {
  const result = nullableString(value);
  if (!result) throw new Error(`Missing ${field}`);
  return result;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid numeric value");
  return parsed;
}

function requiredNumber(value: unknown, field: string) {
  const parsed = nullableNumber(value);
  if (parsed == null) throw new Error(`Missing ${field}`);
  return parsed;
}

function orderBucket(order: LifecycleOrder) {
  const raw = order.status || order.status_fr || "";
  const normalized = String(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (["draft", "propose"].includes(normalized)) return "proposed";
  if (["submitted", "partially_filled", "en_cours"].includes(normalized)) return "running";
  if (["filled", "execute"].includes(normalized)) return "filled";
  if (["cancelled", "expired", "rejected", "annule"].includes(normalized)) return "cancelled";
  return "other";
}

function buildSummary(orders: LifecycleOrder[]) {
  return orders.reduce(
    (acc, order) => {
      switch (orderBucket(order)) {
        case "proposed":
          acc.pending += 1;
          break;
        case "running":
          acc.placed += 1;
          break;
        case "filled":
          acc.filled += 1;
          break;
        case "cancelled":
          acc.expired += 1;
          break;
      }
      acc.total += 1;
      return acc;
    },
    { pending: 0, placed: 0, filled: 0, expired: 0, total: 0 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || 100);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    let query = supabase
      .from("vw_orders_lifecycle")
      .select("*")
      .eq("user_id", USER_ID_DEV)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    return NextResponse.json({
      orders: orders || [],
      summary: buildSummary((orders || []) as LifecycleOrder[]),
    });
  } catch (err: unknown) {
    console.error("[/api/orders/active] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
        orders: [],
        summary: null,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "");
    const action = String(body.action || "placed");
    const brokerRef =
      typeof body.brokerRef === "string" && body.brokerRef.trim()
        ? body.brokerRef.trim()
        : null;
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;
    const fillPrice = nullableNumber(body.fillPrice);
    const fillQuantity = nullableNumber(body.fillQuantity);
    const fees = nullableNumber(body.fees) ?? 0;
    const filledAt = nullableString(body.filledAt);

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "public" },
      auth: { persistSession: false },
    });

    let rpc;

    if (action === "cancelled") {
      rpc = supabase.rpc("fn_mark_order_cancelled", {
        p_order_id: orderId,
        p_reason: reason,
      });
    } else if (action === "filled") {
      if (fillPrice == null || fillQuantity == null) {
        return NextResponse.json({ error: "Missing fill fields" }, { status: 400 });
      }

      const filledArgs: Record<string, string | number | null> = {
        p_order_id: orderId,
        p_fill_price: fillPrice,
        p_fill_quantity: fillQuantity,
        p_fees: fees,
      };
      if (filledAt) filledArgs.p_filled_at = filledAt;

      rpc = supabase.rpc("fn_mark_order_filled_manual", {
        ...filledArgs,
      });
    } else {
      rpc = supabase.rpc("fn_mark_order_placed", {
        order_id: orderId,
        broker_ref: brokerRef,
      });
    }

    const { data, error } = await rpc;

    if (error) throw error;

    return NextResponse.json({ order: data ?? { id: orderId } });
  } catch (err: unknown) {
    console.error("[/api/orders/active PATCH] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const args = body && typeof body === "object" ? body as Record<string, unknown> : {};

    const rpcArgs = {
      p_user_id: nullableString(args.userId) ?? USER_ID_DEV,
      p_account_id: requiredString(args.accountId, "accountId"),
      p_ticker: requiredString(args.ticker, "ticker").toUpperCase(),
      p_side: requiredString(args.side, "side"),
      p_quantity: requiredNumber(args.quantity, "quantity"),
      p_limit_price: nullableNumber(args.limitPrice),
      p_order_type: nullableString(args.orderType) ?? "limit",
      p_currency: nullableString(args.currency),
      p_already_placed: Boolean(args.alreadyPlaced),
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "public" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_create_manual_order", rpcArgs);

    if (error) throw error;

    return NextResponse.json({ order: data });
  } catch (err: unknown) {
    console.error("[/api/orders/active POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
