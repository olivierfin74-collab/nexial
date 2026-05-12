"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

type FlashDropEvent = {
  id: string;
  ticker: string;
  opportunity_type: "FLASH_DROP";
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  suggested_action: "WATCH" | "PREPARE_LADDER" | "WAIT";
  latest_price: number | null;
  drop_pct: number | null;
  ladder: {
    z1_price: number;
    z2_price: number;
    z3_price: number;
    z1_weight: number;
    z2_weight: number;
    z3_weight: number;
  } | null;
};

const pct = (value: number | null) => (
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "-"
);

const price = (value: number | null) => (
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-"
);

export default function FlashDropEventsStrip() {
  const [events, setEvents] = useState<FlashDropEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/opportunities/feed?limit=5")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setEvents(json.items || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 md:px-8">
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-800">
          <Zap className="h-4 w-4" />
          Flash drops detectes
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {events.map((event) => (
            <a
              key={event.id}
              href={`/aujourdhui?alert=${encodeURIComponent(event.id)}`}
              className="min-w-[260px] max-w-[320px] rounded-lg border border-red-200 bg-white px-3 py-2 text-sm transition-colors hover:border-red-400"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-red-700">Flash Drop</div>
                  <div className="truncate font-bold text-gray-900">{event.ticker}</div>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {event.priority}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-red-50 px-2 py-1">
                  <div className="font-bold text-red-800">{pct(event.drop_pct)}</div>
                  <div className="text-[10px] uppercase text-gray-500">Drop</div>
                </div>
                <div className="rounded bg-gray-50 px-2 py-1">
                  <div className="font-bold text-gray-900">{event.suggested_action}</div>
                  <div className="text-[10px] uppercase text-gray-500">Posture</div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
                <div className="rounded border border-gray-100 px-1.5 py-1">
                  <div className="font-bold text-gray-900">{price(event.ladder?.z1_price ?? null)}</div>
                  <div className="text-[10px] text-gray-500">Z1 40%</div>
                </div>
                <div className="rounded border border-gray-100 px-1.5 py-1">
                  <div className="font-bold text-gray-900">{price(event.ladder?.z2_price ?? null)}</div>
                  <div className="text-[10px] text-gray-500">Z2 35%</div>
                </div>
                <div className="rounded border border-gray-100 px-1.5 py-1">
                  <div className="font-bold text-gray-900">{price(event.ladder?.z3_price ?? null)}</div>
                  <div className="text-[10px] text-gray-500">Z3 25%</div>
                </div>
              </div>

              <div className="mt-2 truncate text-xs text-gray-600">{event.reason}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
