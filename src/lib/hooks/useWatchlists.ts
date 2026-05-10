"use client";

import { useCallback, useEffect, useState } from "react";

export type Watchlist = {
  watchlist_id: string;
  name: string;
  description: string | null;
  kind: "CONVICTION" | "OPPORTUNITY" | "DCA";
  account_id: string | null;
  account_name: string | null;
  account_broker: string | null;
  account_universe: string | null;
  universe: string | null;
  color: string;
  icon: string | null;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  items_count: number;
  created_at: string;
  updated_at: string;
};

export function useWatchlists(opts?: { pollMs?: number }) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollMs = opts?.pollMs ?? 60000;

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlists");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setWatchlists(json.watchlists || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Fetch error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await fetchOnce();
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  // Mutation helpers — call refetch after to refresh local cache
  const create = useCallback(
    async (input: {
      name: string;
      description?: string;
      account_id?: string | null;
      universe?: string | null;
      color?: string;
      icon?: string | null;
      kind?: "CONVICTION" | "OPPORTUNITY" | "DCA";
    }) => {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      await fetchOnce();
      return json.watchlist_id as string;
    },
    [fetchOnce]
  );

  const update = useCallback(
    async (
      id: string,
      patch: {
        name?: string;
        description?: string;
        color?: string;
        icon?: string;
        account_id?: string | null;
        universe?: string | null;
        clear_account?: boolean;
        clear_universe?: boolean;
      }
    ) => {
      const res = await fetch(`/api/watchlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchOnce();
    },
    [fetchOnce]
  );

  const remove = useCallback(
    async (id: string, hard = false) => {
      const res = await fetch(`/api/watchlists/${id}${hard ? "?hard=1" : ""}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchOnce();
    },
    [fetchOnce]
  );

  return { watchlists, loading, error, refetch: fetchOnce, create, update, remove };
}
