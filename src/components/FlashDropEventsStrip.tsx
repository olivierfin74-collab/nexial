"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

type FlashDropEvent = {
  id: string;
  ticker: string;
  deeplink_url: string;
  message_text: string;
  price: number | null;
  intraday_change_pct: number | null;
  close_to_close_pct: number | null;
  price_vs_vwap_pct: number | null;
  signal_strength: "MEDIUM" | "HIGH" | "EXTREME";
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
};

const pct = (value: number | null) => (
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "-"
);

export default function FlashDropEventsStrip() {
  const [events, setEvents] = useState<FlashDropEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flash-drops/alerts?limit=5")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setEvents(json.alerts || []);
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
              href={event.deeplink_url}
              className="min-w-44 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm transition-colors hover:border-red-400"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-gray-900">{event.ticker}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {event.severity}
                </span>
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-red-800">{event.message_text}</div>
              <div className="mt-1 text-xs text-gray-600">
                Intraday {pct(event.intraday_change_pct)} · C/C {pct(event.close_to_close_pct)} · VWAP {pct(event.price_vs_vwap_pct)}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
