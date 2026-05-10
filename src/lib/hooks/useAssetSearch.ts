"use client";

import { useCallback, useEffect, useState } from "react";

export type InternalAssetResult = {
  asset_id: string;
  ticker: string;
  exchange_mic: string | null;
  asset_name: string;
  currency: string;
  sector: string | null;
  coverage_level: "NEXIAL_CORE" | "NEXIAL_TRACKED" | "USER_NOTE";
  is_in_db: true;
  match_score: number;
};

export type ExternalAssetResult = {
  ticker: string;
  exchange_mic: string | null;
  asset_name: string;
  currency: string | null;
  exchange_region: string | null;
  asset_class: string;
  country: string | null;
  data_source: "twelve_data";
  data_source_symbol: string;
  is_in_db: false;
  match_score: number;
};

type SearchResponse = {
  internal: InternalAssetResult[];
  external: ExternalAssetResult[];
  external_search_available: boolean;
};

const EMPTY: SearchResponse = {
  internal: [],
  external: [],
  external_search_available: true,
};

/**
 * Debounced asset search hook.
 *
 * Internal results come from nx.assets (instant, fully covered).
 * External results come from Twelve Data (may need to be created
 * in our DB via `createUserAsset` before adding to a watchlist).
 */
export function useAssetSearch(opts?: { debounceMs?: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceMs = opts?.debounceMs ?? 300;

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = `/api/assets/search?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SearchResponse;
        if (cancelled) return;
        setResults({
          internal: json.internal || [],
          external: json.external || [],
          external_search_available: json.external_search_available !== false,
        });
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Search error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  /**
   * Create a user-added asset from an external search result.
   * Returns the asset_id (idempotent: same input -> same id).
   */
  const createUserAsset = useCallback(async (ext: ExternalAssetResult) => {
    const res = await fetch("/api/assets/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: ext.ticker,
        exchange_mic: ext.exchange_mic,
        asset_name: ext.asset_name,
        currency: ext.currency,
        exchange_region: ext.exchange_region,
        asset_class: ext.asset_class,
        data_source: ext.data_source,
        data_source_symbol: ext.data_source_symbol,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.asset_id as string;
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    createUserAsset,
  };
}
