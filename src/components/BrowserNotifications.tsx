"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";
const STORAGE_KEY = "nexial.browserNotifications.enabled";
const CHANGE_EVENT = "nexial-browser-notifications-change";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

type InvestmentAlert = {
  id?: string;
  ticker?: string | null;
  alert_kind?: string | null;
  priority?: string | null;
  severity?: string | null;
  message_text?: string | null;
  opportunity_score?: number | null;
  status?: string | null;
};

function notificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function getPermission(): PermissionState {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

function alertPriority(alert: InvestmentAlert) {
  return (alert.priority || alert.severity || "").toUpperCase();
}

function shouldNotify(alert: InvestmentAlert) {
  const priority = alertPriority(alert);
  return priority === "HIGH" || priority === "CRITICAL";
}

function alertUrl(alert: InvestmentAlert) {
  return `/aujourdhui${alert.id ? `?alert=${encodeURIComponent(alert.id)}` : ""}`;
}

function notificationPayload(alert: InvestmentAlert) {
  const ticker = alert.ticker || "Nexial";
  const kind = alert.alert_kind || "Alerte";
  const score = alert.opportunity_score != null ? `Score ${Math.round(Number(alert.opportunity_score))}` : "Nouvelle alerte";

  return {
    title: `${ticker} - ${kind}`,
    body: alert.message_text || score,
    url: alertUrl(alert),
    priority: alertPriority(alert),
    tag: alert.id || `${ticker}-${kind}`,
  };
}

async function setAppBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };

  try {
    if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
    if (count === 0 && nav.clearAppBadge) await nav.clearAppBadge();
  } catch {
    // Badge API is optional and may be blocked by the browser.
  }
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<PermissionState>(() => getPermission());
  const [enabled, setEnabled] = useState(() => (
    typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "true"
  ));

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return false;
    try {
      await navigator.serviceWorker.register("/sw.js");
      return true;
    } catch {
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!notificationSupported()) {
      setPermission("unsupported");
      return "unsupported" as PermissionState;
    }

    await registerServiceWorker();
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);

    if (result === "granted") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }

    return result as PermissionState;
  }, [registerServiceWorker]);

  const setNotificationsEnabled = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const showLocalNotification = useCallback((title: string, body: string, url = "/aujourdhui") => {
    if (getPermission() !== "granted") return false;

    const notification = new Notification(title, {
      body,
      icon: "/icon-192.svg",
      badge: "/badge-72.svg",
      data: { url },
    });

    notification.onclick = () => {
      window.focus();
      window.location.assign(url);
    };

    return true;
  }, []);

  return {
    enabled,
    permission,
    requestPermission,
    setNotificationsEnabled,
    showLocalNotification,
  };
}

export function BrowserNotificationsRuntime() {
  const supabase = useMemo(() => createClient(), []);
  const { showLocalNotification } = useBrowserNotifications();
  const [enabled, setEnabled] = useState(() => (
    typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "true"
  ));

  useEffect(() => {
    const sync = () => setEnabled(window.localStorage.getItem(STORAGE_KEY) === "true");
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!enabled || getPermission() !== "granted") return;

    const channel = supabase
      .channel("investment_alerts:user")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "nx",
          table: "investment_alerts",
          filter: `user_id=eq.${USER_ID_DEV}`,
        },
        (payload) => {
          const alert = payload.new as InvestmentAlert;
          if (alert.status && alert.status !== "NEW") return;
          if (!shouldNotify(alert)) return;

          const data = notificationPayload(alert);
          showLocalNotification(data.title, data.body, data.url);
          setAppBadge(1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, showLocalNotification, supabase]);

  return null;
}

export default function BrowserNotificationsSettings() {
  const {
    enabled,
    permission,
    requestPermission,
    setNotificationsEnabled,
    showLocalNotification,
  } = useBrowserNotifications();
  const [testSent, setTestSent] = useState(false);

  const canEnable = permission === "granted";
  const isDenied = permission === "denied";
  const isUnsupported = permission === "unsupported";

  const handleEnable = async () => {
    if (permission !== "granted") {
      const result = await requestPermission();
      if (result !== "granted") return;
    }
    setNotificationsEnabled(true);
  };

  const handleTest = () => {
    const sent = showLocalNotification(
      "Nexial - test notification",
      "Les notifications navigateur sont actives.",
      "/aujourdhui?alert=test",
    );
    setTestSent(sent);
    if (sent) setAppBadge(1);
  };

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">Notifications navigateur</h2>
          <p className="mt-1 text-sm text-gray-600">
            Recois une notification locale quand une nouvelle alerte HIGH ou CRITICAL arrive pendant que l&apos;app est ouverte.
          </p>
          {isDenied && (
            <p className="mt-2 text-sm text-amber-700">
              Permission bloquee. Reactive les notifications dans les parametres du navigateur pour ce site.
            </p>
          )}
          {isUnsupported && (
            <p className="mt-2 text-sm text-amber-700">
              Ce navigateur ne supporte pas les notifications web.
            </p>
          )}
          {testSent && (
            <p className="mt-2 text-sm text-green-700">Notification de test envoyee.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <button
              type="button"
              onClick={() => setNotificationsEnabled(false)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Desactiver
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={isDenied || isUnsupported}
              className="rounded-lg bg-[#1F4A2E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activer les notifications
            </button>
          )}
          <button
            type="button"
            onClick={handleTest}
            disabled={!enabled || !canEnable}
            className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tester notification
          </button>
        </div>
      </div>
    </section>
  );
}
