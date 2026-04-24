"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  alertId: string;
  currentPrice?: number | null;
  targetQuantity?: number | null;
  targetBuyAmount?: number | null;
};

export default function AlertActions({
  alertId,
  currentPrice,
  targetQuantity,
  targetBuyAmount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"execute" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    try {
      setError(null);
      setLoading("execute");

      const res = await fetch("/api/alerts/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertId,
          executionPrice: currentPrice ?? null,
          executionQuantity: targetQuantity ?? null,
          executionAmount: targetBuyAmount ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Erreur execute");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur execute");
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss() {
    try {
      setError(null);
      setLoading("dismiss");

      const res = await fetch("/api/alerts/dismiss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Erreur dismiss");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur dismiss");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <button
          onClick={handleExecute}
          disabled={loading !== null}
          className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading === "execute" ? "EXECUTION..." : "EXECUTE"}
        </button>

        <button
          onClick={handleDismiss}
          disabled={loading !== null}
          className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
        >
          {loading === "dismiss" ? "DISMISS..." : "DISMISS"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}