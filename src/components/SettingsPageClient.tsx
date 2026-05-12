"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import BrowserNotificationsSettings from "@/components/BrowserNotifications";

type SettingsState = {
  telegram: {
    is_active: boolean;
    chat_id: string;
    min_priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    quiet_hours_start: number;
    quiet_hours_end: number;
  };
  alerts: {
    default_filter: "all" | "hot" | "holdings";
    default_sort: "freshness" | "score";
  };
  behavior: {
    kill_switch_enabled: boolean;
    auto_dismiss_hours: number;
    confirm_watchlist_delete: boolean;
  };
  system: {
    show_technical_details: boolean;
  };
};

type SettingsResponse = {
  telegram?: Record<string, unknown> | null;
  behavior?: Record<string, unknown> | null;
  system?: Record<string, unknown> | null;
  user?: { email?: string | null };
};

type SettingsUpdate = {
  telegram?: Partial<Omit<SettingsState["telegram"], "chat_id">> & { chat_id?: string | null };
  alerts?: Partial<SettingsState["alerts"]>;
  behavior?: Partial<SettingsState["behavior"]>;
  system?: Partial<SettingsState["system"]>;
};

type ManualPricingAsset = Record<string, unknown>;

type ManualPriceForm = {
  ticker: string;
  price: string;
  priceDate: string;
  currency: string;
};

const DEFAULT_SETTINGS: SettingsState = {
  telegram: {
    is_active: false,
    chat_id: "",
    min_priority: "HIGH",
    quiet_hours_start: 23,
    quiet_hours_end: 7,
  },
  alerts: {
    default_filter: "all",
    default_sort: "freshness",
  },
  behavior: {
    kill_switch_enabled: false,
    auto_dismiss_hours: 72,
    confirm_watchlist_delete: true,
  },
  system: {
    show_technical_details: false,
  },
};

const asNumber = (value: unknown, fallback: number) => (
  typeof value === "number" && Number.isFinite(value) ? value : fallback
);

const asString = <T extends string>(value: unknown, fallback: T) => (
  typeof value === "string" && value ? value as T : fallback
);

const asBoolean = (value: unknown, fallback: boolean) => (
  typeof value === "boolean" ? value : fallback
);

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const textValue = (row: ManualPricingAsset, keys: string[], fallback = "-") => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
};

const numberValue = (row: ManualPricingAsset, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const booleanValue = (row: ManualPricingAsset, keys: string[]) => (
  keys.some((key) => row[key] === true || row[key] === "true" || row[key] === 1)
);

const formatManualPrice = (value: number | null, currency: string) => {
  if (value === null) return "-";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} ${currency || ""}`.trim();
};

function mergeSettings(data: SettingsResponse): SettingsState {
  const telegram = data.telegram || {};
  const behavior = data.behavior || {};

  return {
    telegram: {
      is_active: asBoolean(telegram.is_active, DEFAULT_SETTINGS.telegram.is_active),
      chat_id: asString(telegram.chat_id, DEFAULT_SETTINGS.telegram.chat_id),
      min_priority: asString(telegram.min_priority, DEFAULT_SETTINGS.telegram.min_priority),
      quiet_hours_start: asNumber(telegram.quiet_hours_start, DEFAULT_SETTINGS.telegram.quiet_hours_start),
      quiet_hours_end: asNumber(telegram.quiet_hours_end, DEFAULT_SETTINGS.telegram.quiet_hours_end),
    },
    alerts: {
      default_filter: asString(behavior.default_alert_filter, DEFAULT_SETTINGS.alerts.default_filter),
      default_sort: asString(behavior.default_alert_sort, DEFAULT_SETTINGS.alerts.default_sort),
    },
    behavior: {
      kill_switch_enabled: asBoolean(behavior.kill_switch_enabled, DEFAULT_SETTINGS.behavior.kill_switch_enabled),
      auto_dismiss_hours: asNumber(behavior.auto_dismiss_hours, DEFAULT_SETTINGS.behavior.auto_dismiss_hours),
      confirm_watchlist_delete: asBoolean(behavior.confirm_watchlist_delete, DEFAULT_SETTINGS.behavior.confirm_watchlist_delete),
    },
    system: {
      show_technical_details: asBoolean(behavior.show_technical_details, DEFAULT_SETTINGS.system.show_technical_details),
    },
  };
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="font-serif text-2xl text-[#1F4A2E]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
        checked ? "border-[#1F4A2E] bg-[#DDE9D8] text-[#1F4A2E]" : "border-black/10 bg-white text-gray-700"
      }`}
    >
      <span>{label}</span>
      <span>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function ManualPricingSection() {
  const [assets, setAssets] = useState<ManualPricingAsset[]>([]);
  const [form, setForm] = useState<ManualPriceForm>({
    ticker: "",
    price: "",
    priceDate: todayInputValue(),
    currency: "EUR",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/manual");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAssets(Array.isArray(json.assets) ? json.assets : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement prix manuels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadAssets();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadAssets]);

  const sortedAssets = useMemo(() => (
    [...assets].sort((a, b) => Number(booleanValue(b, ["is_held", "held", "in_portfolio"])) - Number(booleanValue(a, ["is_held", "held", "in_portfolio"])))
  ), [assets]);

  const selectAsset = (row: ManualPricingAsset) => {
    setForm((current) => ({
      ...current,
      ticker: textValue(row, ["ticker", "symbol"], current.ticker).toUpperCase(),
      currency: textValue(row, ["currency", "asset_currency"], current.currency).toUpperCase(),
    }));
  };

  const saveManualPrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/pricing/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker,
          price: Number(form.price),
          priceDate: form.priceDate,
          currency: form.currency,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus("Prix manuel enregistre.");
      setForm((current) => ({ ...current, price: "" }));
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur enregistrement prix manuel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Prix manuels">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Workflow temporaire avant migration EODHD. Aucun scraping, aucune logique broker, aucun pricing automatique.
      </div>

      {status && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{status}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <form onSubmit={saveManualPrice} className="grid gap-3 md:grid-cols-4">
        <Field label="Ticker">
          <input
            value={form.ticker}
            onChange={(e) => setForm((current) => ({ ...current, ticker: e.target.value.toUpperCase() }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="INPST"
            required
          />
        </Field>
        <Field label="Prix">
          <input
            type="number"
            min="0"
            step="0.0001"
            value={form.price}
            onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={form.priceDate}
            onChange={(e) => setForm((current) => ({ ...current, priceDate: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="Currency">
          <input
            value={form.currency}
            onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="EUR"
            required
          />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#1F4A2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-4"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Assets necessitant prix manuel</div>
          <button type="button" onClick={loadAssets} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">
            Rafraichir
          </button>
        </div>
        {loading ? (
          <div className="rounded-lg border p-3 text-sm text-gray-500">Chargement...</div>
        ) : sortedAssets.length === 0 ? (
          <div className="rounded-lg border p-3 text-sm text-gray-500">Aucun asset a traiter.</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {sortedAssets.map((row, index) => {
              const ticker = textValue(row, ["ticker", "symbol"], "N/A").toUpperCase();
              const name = textValue(row, ["name", "asset_name", "asset_label"], ticker);
              const currency = textValue(row, ["currency", "asset_currency"], "");
              const held = booleanValue(row, ["is_held", "held", "in_portfolio"]);
              const lastPrice = numberValue(row, ["last_manual_price", "manual_price", "last_price", "current_price"]);
              const lastDate = textValue(row, ["last_manual_price_date", "manual_price_date", "price_date", "priced_at", "updated_at"], "-");
              return (
                <button
                  key={`${ticker}:${index}`}
                  type="button"
                  onClick={() => selectAsset(row)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-mono font-bold">{ticker}</span>
                    <span className="block truncate text-xs text-gray-500">{name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {held && <span className="mb-1 inline-flex rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">Held</span>}
                    <span className="block font-mono text-xs">{formatManualPrice(lastPrice, currency)}</span>
                    <span className="block text-[11px] text-gray-500">{lastDate}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

export default function SettingsPageClient() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [systemSnapshot, setSystemSnapshot] = useState<Record<string, unknown> | null>(null);
  const [email, setEmail] = useState("olivier@nexial.local");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setSettings(mergeSettings(json));
      setSystemSnapshot(json.system || null);
      setEmail(json.user?.email || "olivier@nexial.local");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const patch = useCallback(async (next: SettingsUpdate) => {
    setSaving(true);
    setStatus(null);
    setError(null);
    const nextSettings = {
      ...settings,
      ...next,
      telegram: { ...settings.telegram, ...next.telegram, chat_id: next.telegram?.chat_id ?? settings.telegram.chat_id },
      alerts: { ...settings.alerts, ...next.alerts },
      behavior: { ...settings.behavior, ...next.behavior },
      system: { ...settings.system, ...next.system },
    };
    setSettings(nextSettings);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus("Parametres enregistres.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde settings");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const testTelegram = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test-telegram", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus("Test Telegram envoye.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur test Telegram");
    } finally {
      setSaving(false);
    }
  };

  const systemRows = useMemo(() => (
    Object.entries(systemSnapshot || {}).slice(0, 6)
  ), [systemSnapshot]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Nexial</p>
          <h1 className="font-serif text-4xl text-[#1F4A2E]">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Notifications, alertes, comportement et systeme.</p>
        </div>
        <div className="text-sm text-gray-500">{loading ? "Chargement..." : saving ? "Sauvegarde..." : "Pret"}</div>
      </div>

      {status && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{status}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsSection title="Notifications">
          <div className="rounded-lg bg-[#FBF9F4] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Telegram</div>
                <div className="text-xs text-gray-500">
                  Statut {settings.telegram.is_active ? "actif" : "inactif"}
                </div>
              </div>
              <Toggle
                label="Subscription"
                checked={settings.telegram.is_active}
                onChange={(checked) => patch({ telegram: { is_active: checked } })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Chat ID">
                <input
                  value={settings.telegram.chat_id}
                  onChange={(e) => setSettings((s) => ({ ...s, telegram: { ...s.telegram, chat_id: e.target.value } }))}
                  onBlur={() => patch({ telegram: { chat_id: settings.telegram.chat_id || null } })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Min priority">
                <select
                  value={settings.telegram.min_priority}
                  onChange={(e) => patch({ telegram: { min_priority: e.target.value as SettingsState["telegram"]["min_priority"] } })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option>LOW</option>
                  <option>NORMAL</option>
                  <option>HIGH</option>
                  <option>CRITICAL</option>
                </select>
              </Field>
              <Field label={`Quiet start ${settings.telegram.quiet_hours_start}:00`}>
                <input type="range" min={0} max={23} value={settings.telegram.quiet_hours_start}
                  onChange={(e) => setSettings((s) => ({ ...s, telegram: { ...s.telegram, quiet_hours_start: Number(e.target.value) } }))}
                  onMouseUp={() => patch({ telegram: { quiet_hours_start: settings.telegram.quiet_hours_start } })}
                  className="w-full" />
              </Field>
              <Field label={`Quiet end ${settings.telegram.quiet_hours_end}:00`}>
                <input type="range" min={0} max={23} value={settings.telegram.quiet_hours_end}
                  onChange={(e) => setSettings((s) => ({ ...s, telegram: { ...s.telegram, quiet_hours_end: Number(e.target.value) } }))}
                  onMouseUp={() => patch({ telegram: { quiet_hours_end: settings.telegram.quiet_hours_end } })}
                  className="w-full" />
              </Field>
            </div>
            <button type="button" onClick={testTelegram} className="mt-3 rounded-lg border px-4 py-2 text-sm font-semibold">
              Tester Telegram
            </button>
          </div>

          <BrowserNotificationsSettings />
        </SettingsSection>

        <SettingsSection title="Alertes par defaut">
          <Field label="Filtre Aujourd'hui">
            <select
              value={settings.alerts.default_filter}
              onChange={(e) => patch({ alerts: { default_filter: e.target.value as SettingsState["alerts"]["default_filter"] } })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="hot">Hot only</option>
              <option value="holdings">Holdings only</option>
            </select>
          </Field>
          <Field label="Tri Aujourd'hui">
            <select
              value={settings.alerts.default_sort}
              onChange={(e) => patch({ alerts: { default_sort: e.target.value as SettingsState["alerts"]["default_sort"] } })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="freshness">Fraicheur</option>
              <option value="score">Score</option>
            </select>
          </Field>
        </SettingsSection>

        <ManualPricingSection />

        <SettingsSection title="Comportement">
          <Toggle
            label="Kill switch Telegram"
            checked={settings.behavior.kill_switch_enabled}
            onChange={(checked) => patch({ behavior: { kill_switch_enabled: checked } })}
          />
          <Toggle
            label="Confirmation suppression watchlist"
            checked={settings.behavior.confirm_watchlist_delete}
            onChange={(checked) => patch({ behavior: { confirm_watchlist_delete: checked } })}
          />
          <Field label={`Auto-dismiss ${settings.behavior.auto_dismiss_hours}h`}>
            <input
              type="range"
              min={12}
              max={168}
              step={12}
              value={settings.behavior.auto_dismiss_hours}
              onChange={(e) => setSettings((s) => ({ ...s, behavior: { ...s.behavior, auto_dismiss_hours: Number(e.target.value) } }))}
              onMouseUp={() => patch({ behavior: { auto_dismiss_hours: settings.behavior.auto_dismiss_hours } })}
              className="w-full"
            />
          </Field>
        </SettingsSection>

        <SettingsSection title="Systeme">
          <div className="rounded-lg bg-[#FBF9F4] p-3 text-sm">
            <div className="font-semibold">Compte</div>
            <div className="mt-1 text-gray-600">{email}</div>
          </div>
          <Toggle
            label="Afficher details techniques"
            checked={settings.system.show_technical_details}
            onChange={(checked) => patch({ system: { show_technical_details: checked } })}
          />
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-2 font-semibold">Etat systeme</div>
            {systemRows.length === 0 ? (
              <div className="text-gray-500">Aucun snapshot disponible.</div>
            ) : systemRows.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-t py-2 first:border-t-0">
                <span className="text-gray-500">{key}</span>
                <span className="truncate font-mono">{String(value ?? "-")}</span>
              </div>
            ))}
          </div>
          <Link href="/desktop" className="inline-flex rounded-lg border px-4 py-2 text-sm font-semibold">
            Ouvrir dashboard dev
          </Link>
          <Link href="/aide" className="ml-2 inline-flex rounded-lg border px-4 py-2 text-sm font-semibold">
            Aide
          </Link>
        </SettingsSection>
      </div>
    </main>
  );
}
