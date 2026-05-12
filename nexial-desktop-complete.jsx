import React, { useMemo, useState, useEffect } from "react";
import {
  Bell, ChevronRight, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  ArrowLeft, LayoutGrid, List, Filter, Eye, Activity, Sparkles,
  CheckCircle2, XCircle, Award, Clock, AlertCircle,
  Plus, X, Trash2, Edit3, MoreHorizontal, Search, RefreshCw,
  Zap, Flame, Repeat, ShieldCheck,
} from "lucide-react";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import { useWatchlistItems } from "@/lib/hooks/useWatchlistItems";
import { useAssetSearch } from "@/lib/hooks/useAssetSearch";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { useTodayDashboard } from "@/lib/hooks/useTodayDashboard";
import { createClient } from "@/lib/supabase/client";

/* ============================================================
   NEXIAL DESKTOP — PROTO COMPLET V2 (5 pages + détail asset + dev/admin)
   Premium institutionnel éditorial · ADR-8 LOCKED v2 · Langage v3 validé
   9 mai 2026 · Olivier
   
   Pages :
    1. Tableau    — vue résumé desktop, KPIs + comptes + movers
    2. Aujourd'hui — cockpit éditorial long-format
    3. Ordres     — paper trading, paliers étagés par ticker
    4. Portefeuille — tableau dense / cartes avec sparklines inline
    5. Watchlist  — scanner premium avec scores et états
    + Détail asset — fiche d'analyse 2 colonnes magazine
    + Dev/Admin   — monitoring opérationnel (caché, lien footer)
   ============================================================ */

// Deterministic PRNG (mulberry32) for SSR-safe mock series generation
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const stringSeed = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < (str || "").length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/* ---------- Tokens v2 contraste renforcé (alignés mobile validé) ---------- */
const T = {
  bgCanvas: "#FBF9F4", bgSurface: "#FFFFFF",
  bgPour: "#DDE9D8", bgContre: "#EFE5D2", bgAlert: "#FBE9C1",
  bgDarkPanel: "#0F1410", bgHover: "#F8F5EC", bgSubtle: "#F4F0E6",

  borderSubtle: "#D4CCB8", borderHair: "#A89E84", borderUltra: "#EDE6D6",

  inkPrimary: "#0A0A0A", inkSecondary: "#3A3A3A", inkTertiary: "#6B6B6B",
  inkQuaternary: "#9A9180", inkOnDark: "#FBF9F4",

  forestGreen: "#1F4A2E", forestGreenLight: "#3D7553",
  forestGreenPale: "#7AA886", forestGreenOnDark: "#A8C4B0",
  burgundy: "#5F2222", burgundyLight: "#8A4040",
  amber: "#8B5E0A", gold: "#7D6628",
  msciGray: "#9B9B9B",
};

const FONT_DISPLAY = '"Tobias","Fraunces","Playfair Display","Iowan Old Style",Georgia,serif';
const FONT_SANS = '"Inter","Söhne",system-ui,sans-serif';
const FONT_MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace';

const CONTAINER_MAX = 1200;
const CONTAINER_PAD = 40;

/* ---------- Helpers ---------- */
const fmtEur = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const fmtPct = (n, withSign = true) => (withSign && n > 0 ? "+" : "") + n.toFixed(1) + "%";
const assetIdentityKey = (asset) => {
  const value = [
    asset?.asset_id,
    asset?.assetId,
    asset?.ticker,
    asset?.symbol,
    asset?.asset_name,
    asset?.name,
  ].find((v) => v !== undefined && v !== null && String(v).trim() !== "");

  return value ? String(value).trim().toUpperCase() : "";
};
const dedupeAssetGroups = (...groups) => {
  const seen = new Set();
  return groups.map((items = []) => (
    (items || []).filter((item) => {
      const key = assetIdentityKey(item);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  ));
};
const assetReactKey = (asset, prefix, index) => {
  const key = assetIdentityKey(asset);
  return key ? `${prefix}:${key}` : `${prefix}:row-${index}`;
};

const getAlertFreshness = (createdAt, ageHoursOverride) => {
  let ageHours = typeof ageHoursOverride === "number" ? ageHoursOverride : null;

  if (ageHours == null && createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!Number.isNaN(createdTime)) {
      ageHours = Math.max(0, (Date.now() - createdTime) / 36e5);
    }
  }

  if (ageHours == null) {
    return { color: "#828794", label: "age inconnu", tier: "unknown", tone: "ancien" };
  }

  const roundedHours = Math.max(1, Math.round(ageHours));
  const days = Math.max(1, Math.round(ageHours / 24));
  const label = ageHours < 24 ? `il y a ${roundedHours}h` : `il y a ${days}j`;

  if (ageHours < 24) return { color: "#2D5F3F", label, tier: "fresh", tone: "frais" };
  if (ageHours <= 72) return { color: "#C9A14A", label, tier: "recent", tone: "recent" };
  return { color: "#828794", label, tier: "old", tone: "ancien" };
};

const isPersistedAlertId = (alertId) => (
  Boolean(alertId) && !String(alertId).startsWith("mock-")
);

/* ============================================================
   PRIMITIVES (alignées mobile validé byte-pour-byte sur les noms/comportements)
   ============================================================ */

const Eyebrow = ({ children, color = T.forestGreen, style = {} }) => (
  <span style={{
    fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
    letterSpacing: "0.16em", textTransform: "uppercase",
    color, ...style,
  }}>{children}</span>
);

const MetricChip = ({ children, variant = "neutral", style = {} }) => {
  const v = {
    positive: { bg: T.bgPour, fg: T.forestGreen },
    negative: { bg: T.bgContre, fg: T.burgundy },
    neutral: { bg: "#F0EBDF", fg: T.inkSecondary },
    warning: { bg: T.bgAlert, fg: T.amber },
  }[variant];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 4,
      fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 700,
      letterSpacing: "-0.01em", color: v.fg, backgroundColor: v.bg,
      ...style,
    }}>{children}</span>
  );
};

const Badge = ({ children, variant = "default", style = {} }) => {
  const v = {
    default: { bg: T.inkPrimary, fg: T.inkOnDark, border: "transparent" },
    success: { bg: T.forestGreen, fg: T.inkOnDark, border: "transparent" },
    warning: { bg: T.amber, fg: T.inkOnDark, border: "transparent" },
    danger: { bg: T.burgundy, fg: T.inkOnDark, border: "transparent" },
    soft: { bg: T.bgSurface, fg: T.inkSecondary, border: T.borderSubtle },
    outline: { bg: "transparent", fg: T.inkSecondary, border: T.borderHair },
  }[variant];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 8px", borderRadius: 4,
      fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.10em", textTransform: "uppercase",
      backgroundColor: v.bg, color: v.fg,
      border: `1px solid ${v.border}`,
      ...style,
    }}>{children}</span>
  );
};

const ScoreGauge = ({ value, max = 10, size = 64 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color = value >= 8 ? T.forestGreen : value >= 6 ? T.forestGreenLight : value >= 4 ? T.gold : T.burgundy;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={T.borderSubtle} strokeWidth={stroke} vectorEffect="non-scaling-stroke" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          vectorEffect="non-scaling-stroke"
          style={{ transition: "stroke-dashoffset 800ms ease-out" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        lineHeight: 1,
      }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: size * 0.36,
          fontWeight: 500, color: T.inkPrimary, letterSpacing: "-0.02em",
        }}>{value.toFixed(1)}</span>
        <span style={{
          fontFamily: FONT_SANS, fontSize: 9, color: T.inkTertiary,
          fontWeight: 600, letterSpacing: "0.08em", marginTop: 2,
        }}>/{max}</span>
      </div>
    </div>
  );
};

/* ============================================================
   SPARKLINE — signature visuelle premium
   ============================================================ */
const Sparkline = ({
  data, benchmark = null, height = 80, color = T.forestGreen,
  fillGradient = false, showFinalDot = true, strokeWidth = 1.5, id = "spark",
}) => {
  const { path, benchPath, finalY } = useMemo(() => {
    const all = [...data, ...(benchmark || [])];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = max - min || 1;
    const yPad = 6;
    const usableH = height - yPad * 2;
    const buildPath = (series) => series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * 100;
        const y = yPad + (1 - (v - min) / range) * usableH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(3)},${y.toFixed(3)}`;
      }).join(" ");
    const last = data[data.length - 1];
    return {
      path: buildPath(data),
      benchPath: benchmark ? buildPath(benchmark) : "",
      finalY: yPad + (1 - (last - min) / range) * usableH,
    };
  }, [data, benchmark, height]);

  const fillD = path ? `${path} L100,${height} L0,${height} Z` : "";

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        {fillGradient && (
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        )}
      </defs>
      {fillGradient && fillD && <path d={fillD} fill={`url(#grad-${id})`} />}
      {benchPath && (
        <path d={benchPath} fill="none" stroke={T.msciGray} strokeWidth="1"
          strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke" />
      {showFinalDot && (
        <circle cx="100" cy={finalY} r="2.5" fill={color} stroke="none" />
      )}
    </svg>
  );
};

/* ============================================================
   MOCK DATA (réelles 8 mai 2026, alignées mobile validé)
   ============================================================ */
const genSeries = (start, end, n, vol = 0.012, seedKey = "default") => {
  const rng = makeRng(stringSeed(seedKey));
  const data = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    const drift = (end / start - 1) / n;
    v = v * (1 + drift + (rng() - 0.5) * vol);
    data.push(v);
  }
  const scale = end / data[data.length - 1];
  return data.map((x) => x * scale);
};

const portfolioSeries = genSeries(125000, 149903, 84, 0.013, "portfolio-main");
const msciBenchSeries = genSeries(125000, 141000, 84, 0.009, "msci-bench");

const MOCK = {
  user: { name: "Olivier" },
  date: { full: "Samedi 9 mai 2026", short: "Samedi 9 mai · 13:42 · marché clos" },
  portfolio: {
    total: 149903, pnlEur: 24758, pnlPct: 19.8, cashEur: 25084,
    series: portfolioSeries, benchmark: msciBenchSeries,
    accounts: [
      { name: "PEA", broker: "Boursobank", value: 129475, share: 86.4 },
      { name: "CTO IBKR", broker: "IBKR", value: 19056, share: 12.7 },
      { name: "CTO Trade Republic", broker: "Trade Republic", value: 1372, share: 0.9 },
    ],
  },
  regime: {
    label: "BULL_LIGHT", multiplier: 0.85, confidence: 65,
    note: "Marché en consolidation après +12% YTD, breadth en contraction. Sizing global réduit de 15% jusqu'à clarification du leadership sectoriel.",
  },
  indices: [
    { name: "CAC 40", value: "8 142", delta: -0.4, series: genSeries(7800, 8142, 60, 0.008) },
    { name: "S&P 500", value: "5 614", delta: 0.2, series: genSeries(5400, 5614, 60, 0.007) },
    { name: "Nasdaq", value: "18 290", delta: -0.6, series: genSeries(17800, 18290, 60, 0.011) },
    { name: "VIX", value: "18.4", delta: 4.2, series: genSeries(15, 18.4, 60, 0.04) },
  ],
  actions: [
    {
      ticker: "ISRG", name: "Intuitive Surgical",
      sector: "Healthcare · MedTech · NASDAQ · USD",
      score: 8.4, currency: "$", price: 446.20, delta: -9.1,
      thesis: "Pullback de 9% sur l'un des compounders MedTech les plus solides. Thèse fondamentale intacte — pricing power préservé, marges au-dessus de la moyenne sectorielle, free cash flow yield au plus haut depuis 24 mois.",
      paliers: [
        { rank: "P1", price: 446, qty: 8, weight: 40 },
        { rank: "P2", price: 432, qty: 7, weight: 35 },
        { rank: "P3", price: 411, qty: 5, weight: 25 },
      ],
      series: genSeries(490, 446, 90, 0.014),
      reasons: [
        "Score qualité 8.4 — top quartile secteur",
        "Pullback technique sans dégradation fondamentale",
        "Free cash flow yield > 4% à ce prix",
      ],
    },
    {
      ticker: "OR.PA", name: "L'Oréal",
      sector: "Consumer · Luxe beauté · Euronext · EUR",
      score: 7.9, currency: "€", price: 359.40, delta: -7.4,
      thesis: "Atterrissage sur support technique long terme. Faiblesse Chine largement intégrée, marges à plancher historique, diversification géographique limite le downside.",
      paliers: [
        { rank: "P1", price: 359, qty: 10, weight: 40 },
        { rank: "P2", price: 352, qty: 9, weight: 35 },
        { rank: "P3", price: 342, qty: 6, weight: 25 },
      ],
      series: genSeries(390, 359, 90, 0.011),
      reasons: [
        "Support technique 5 ans testé",
        "PE forward 24× contre médiane 28×",
        "Diversification géographique intacte",
      ],
    },
    {
      ticker: "AI.PA", name: "Air Liquide",
      sector: "Industrials · Gases industriels · Euronext · EUR",
      score: 7.2, currency: "€", price: 168.20, delta: -3.2,
      thesis: "Consolidation saine après hausse, dividende en croissance solide depuis 60 ans. Surveiller franchissement Z2 pour confirmation d'entrée graduée.",
      paliers: [
        { rank: "Watch", price: 168, qty: 12, weight: 50 },
        { rank: "P1", price: 162, qty: 10, weight: 50 },
      ],
      series: genSeries(176, 168, 90, 0.008),
      reasons: [
        "60 ans de dividende croissant",
        "Approche Z2 — surveiller franchissement",
        "Bilan AAA, expansion hydrogène structurelle",
      ],
    },
  ],
  contributors: [
    { ticker: "ASML", name: "ASML Holding", account: "PEA", pnlPct: 112.1, pnlEur: 20262, value: 38263 },
    { ticker: "SU", name: "Schneider Electric", account: "PEA", pnlPct: 24.02, pnlEur: 2059, value: 10631 },
    { ticker: "WPEA", name: "iShares MSCI World", account: "PEA", pnlPct: 12.42, pnlEur: 849, value: 7681 },
    { ticker: "AI", name: "Air Liquide", account: "PEA", pnlPct: 6.69, pnlEur: 988, value: 15761 },
  ],
  detractors: [
    { ticker: "RMS", name: "Hermès", account: "PEA", pnlPct: -7.59, pnlEur: -955, value: 11627 },
    { ticker: "PANX", name: "Amundi Nasdaq-100", account: "PEA", pnlPct: -7.70, pnlEur: -740, value: 8858 },
    { ticker: "MC", name: "LVMH", account: "PEA", pnlPct: -3.27, pnlEur: -591, value: 17490 },
  ],
  alerts: [
    { id: "mock-desktop-meli", status: "NEW", time: "23:30", ticker: "MELI", kind: "FLASH_DROP", severity: "CRITICAL", created_at: "2026-05-12T09:30:00+02:00",
      delta: -12.7, message: "Chute brutale -12.7% sans catalyseur identifié. Surveiller pour confirmation J+1 avant entrée graduée." },
    { id: "mock-desktop-crwd", status: "NEW", time: "21:48", ticker: "CRWD", kind: "OVERBOUGHT_HOLD", severity: "HIGH", created_at: "2026-05-11T21:48:00+02:00",
      delta: 18.2, message: "Tension haussière extrême — RSI 78, momentum à 3 mois en zone d'épuisement." },
    { id: "mock-desktop-nvda", status: "NEW", time: "20:15", ticker: "NVDA", kind: "OVERBOUGHT_HOLD", severity: "HIGH", created_at: "2026-05-10T20:15:00+02:00",
      delta: 22.1, message: "Position détenue à +57% — pas de renforcement, surveillance des prises de profits." },
    { id: "mock-desktop-panx", status: "NEW", time: "18:55", ticker: "PANX", kind: "OVERBOUGHT_HOLD", severity: "WARNING", created_at: "2026-05-09T18:55:00+02:00",
      delta: 8.4, message: "Tension haussière sur ETF Nasdaq-100. Score 85, position détenue." },
    { id: "mock-desktop-ai", status: "NEW", time: "18:20", ticker: "AI", kind: "BUY_ZONE_ENTERED", severity: "INFO", created_at: "2026-05-08T18:20:00+02:00",
      delta: -3.2, message: "Approche Z2 — surveiller franchissement pour entrée graduée." },
  ],
  horizon: [
    { date: "11 mai", label: "Reprise pipeline daily · J+1 mesurés sur 9 alertes seedées" },
    { date: "13 mai", label: "J+5 outcomes calculés sur 9 alertes" },
    { date: "22 mai", label: "Paper orders ISRG / OR.PA expirent (GTC 14j)" },
    { date: "25 mai", label: "Cutover EODHD All-In-One ($19.99/mo, économie ~$700/an)" },
    { date: "1 juin", label: "Reprise salariat · Nexial autonome opérationnel" },
  ],
  // ========================================
  // POSITIONS (Portefeuille — 8 positions)
  // ========================================
  positions: [
    { ticker: "ASML", name: "ASML Holding", account: "PEA", qty: 22, price: 1739.05, value: 38263, pnlEur: 20262, pnlPct: 112.1, sector: "Tech · Semicap", series: genSeries(820, 1739, 60, 0.018) },
    { ticker: "MC", name: "LVMH", account: "PEA", qty: 25, price: 699.60, value: 17490, pnlEur: -591, pnlPct: -3.27, sector: "Luxe", series: genSeries(723, 699, 60, 0.011) },
    { ticker: "AI", name: "Air Liquide", account: "PEA", qty: 94, price: 167.67, value: 15761, pnlEur: 988, pnlPct: 6.69, sector: "Industrie · Gaz", series: genSeries(157, 168, 60, 0.008) },
    { ticker: "RMS", name: "Hermès", account: "PEA", qty: 6, price: 1937.83, value: 11627, pnlEur: -955, pnlPct: -7.59, sector: "Luxe", series: genSeries(2096, 1938, 60, 0.013) },
    { ticker: "SU", name: "Schneider Electric", account: "PEA", qty: 36, price: 295.30, value: 10631, pnlEur: 2059, pnlPct: 24.02, sector: "Industrie · Énergie", series: genSeries(238, 295, 60, 0.012) },
    { ticker: "PANX", name: "Amundi Nasdaq-100", account: "PEA", qty: 410, price: 21.61, value: 8858, pnlEur: -740, pnlPct: -7.70, sector: "ETF · US Tech", series: genSeries(23.4, 21.6, 60, 0.014) },
    { ticker: "WPEA", name: "iShares MSCI World", account: "PEA", qty: 1190, price: 6.45, value: 7681, pnlEur: 849, pnlPct: 12.42, sector: "ETF · Monde", series: genSeries(5.74, 6.45, 60, 0.008) },
    { ticker: "NVDA", name: "NVIDIA Corp", account: "CTO IBKR", qty: 28, price: 510.65, value: 14298, pnlEur: 5193, pnlPct: 57.05, sector: "Tech · Semicap", series: genSeries(325, 510, 60, 0.020) },
  ],
  // ========================================
  // WATCHLIST (10 actifs surveillés)
  // ========================================
  watchlist: [
    { ticker: "ISRG", name: "Intuitive Surgical", state: "OPPORTUNITY_LIGHT", quality: "ULTRA_PREMIUM", isHeld: false, score: 8.4, price: 446.20, currency: "$", delta: -9.1, sector: "MedTech", series: genSeries(490, 446, 60, 0.014) },
    { ticker: "OR.PA", name: "L'Oréal", state: "OPPORTUNITY_LIGHT", quality: "ULTRA_PREMIUM", isHeld: false, score: 7.9, price: 359.40, currency: "€", delta: -7.4, sector: "Luxe Beauté", series: genSeries(390, 359, 60, 0.011) },
    { ticker: "AI", name: "Air Liquide", state: "WATCH_BORDERLINE", quality: "ULTRA_PREMIUM", isHeld: true, score: 7.2, price: 167.67, currency: "€", delta: -3.2, sector: "Industrie", series: genSeries(176, 168, 60, 0.008) },
    { ticker: "MELI", name: "MercadoLibre", state: "FLASH_DROP", quality: "PREMIUM", isHeld: false, score: 6.8, price: 1450.30, currency: "$", delta: -12.7, sector: "E-commerce LATAM", series: genSeries(1660, 1450, 60, 0.022) },
    { ticker: "MC", name: "LVMH", state: "HOLD", quality: "ULTRA_PREMIUM", isHeld: true, score: 7.1, price: 699.60, currency: "€", delta: -3.3, sector: "Luxe", series: genSeries(723, 699, 60, 0.011) },
    { ticker: "RMS", name: "Hermès", state: "HOLD", quality: "ULTRA_PREMIUM", isHeld: true, score: 8.8, price: 1937.83, currency: "€", delta: -7.6, sector: "Luxe", series: genSeries(2096, 1938, 60, 0.013) },
    { ticker: "ASML", name: "ASML Holding", state: "HOLD", quality: "ULTRA_PREMIUM", isHeld: true, score: 9.2, price: 1739.05, currency: "€", delta: 1.2, sector: "Semicap", series: genSeries(1670, 1739, 60, 0.013) },
    { ticker: "SU", name: "Schneider Electric", state: "HOLD", quality: "PREMIUM", isHeld: true, score: 7.6, price: 295.30, currency: "€", delta: 0.4, sector: "Industrie", series: genSeries(285, 295, 60, 0.010) },
    { ticker: "CRWD", name: "CrowdStrike", state: "OVERBOUGHT", quality: "PREMIUM", isHeld: false, score: 5.4, price: 380.50, currency: "$", delta: 18.2, sector: "Cybersécurité", series: genSeries(285, 380, 60, 0.020) },
    { ticker: "NVDA", name: "NVIDIA Corp", state: "OVERBOUGHT", quality: "ULTRA_PREMIUM", isHeld: true, score: 6.2, price: 510.65, currency: "$", delta: 22.1, sector: "Semicap", series: genSeries(370, 510, 60, 0.022) },
  ],
  // ========================================
  // ORDRES PAPER (6 paliers sur 2 tickers)
  // ========================================
  paperOrders: [
    {
      ticker: "ISRG", name: "Intuitive Surgical", currency: "$",
      score: 8.4, currentPrice: 446.20, totalQty: 20,
      series: genSeries(490, 446, 60, 0.014),
      paliers: [
        { rank: "P1", price: 446, qty: 8, weight: 40, dist: 0.0, status: "Limite atteint" },
        { rank: "P2", price: 432, qty: 7, weight: 35, dist: -3.2, status: "À atteindre" },
        { rank: "P3", price: 411, qty: 5, weight: 25, dist: -7.9, status: "À atteindre" },
      ],
      expiresAt: "22 mai 2026",
    },
    {
      ticker: "OR.PA", name: "L'Oréal", currency: "€",
      score: 7.9, currentPrice: 359.40, totalQty: 25,
      series: genSeries(390, 359, 60, 0.011),
      paliers: [
        { rank: "P1", price: 359, qty: 10, weight: 40, dist: 0.0, status: "Limite atteint" },
        { rank: "P2", price: 352, qty: 9, weight: 35, dist: -2.1, status: "À atteindre" },
        { rank: "P3", price: 342, qty: 6, weight: 25, dist: -4.9, status: "À atteindre" },
      ],
      expiresAt: "22 mai 2026",
    },
  ],
  // ========================================
  // ASSET DETAIL (ISRG par défaut, fiche complète)
  // ========================================
  assetDetail: {
    ticker: "ISRG",
    name: "Intuitive Surgical",
    sector: "Healthcare · MedTech · NASDAQ · USD",
    quality: "ULTRA_PREMIUM",
    state: "OPPORTUNITY_LIGHT",
    currency: "$",
    price: 446.20,
    delta: -9.1,
    score: 8.4,
    scoreSubs: [
      { label: "Qualité", value: 9.2 },
      { label: "Croissance", value: 8.1 },
      { label: "Momentum", value: 5.8 },
      { label: "Valorisation", value: 8.4 },
    ],
    thesis: "Pullback de 9% sur l'un des compounders MedTech les plus solides. Thèse fondamentale intacte — pricing power préservé, marges au-dessus de la moyenne sectorielle, free cash flow yield au plus haut depuis 24 mois.",
    pour: [
      "Pricing power leader mondial robotique chirurgicale",
      "Marges opérationnelles 30%+ sur 5 ans",
      "Score qualité 9.2 — top quartile secteur",
      "FCF yield 4.2% à ce prix, plus haut depuis 24 mois",
    ],
    contre: [
      "Multiple PE forward 42× au-dessus de la médiane historique",
      "Concurrence Medtronic / J&J sur certains segments",
      "Score momentum 5.8 — pullback en cours",
    ],
    paliers: [
      { rank: "P1", price: 446, qty: 8, weight: 40 },
      { rank: "P2", price: 432, qty: 7, weight: 35 },
      { rank: "P3", price: 411, qty: 5, weight: 25 },
    ],
    series: genSeries(490, 446, 90, 0.014),
    indicators: [
      { label: "RSI 14j", value: "38", state: "neutral" },
      { label: "PE forward", value: "42×", state: "warning" },
      { label: "FCF yield", value: "4.2%", state: "positive" },
      { label: "Croissance CA 5a", value: "+18%", state: "positive" },
      { label: "Marge op.", value: "30%", state: "positive" },
      { label: "Volatilité 30j", value: "21%", state: "neutral" },
    ],
    pastAlerts: [
      { date: "9 mai", kind: "BUY_ZONE_ENTERED", outcome: "En cours" },
      { date: "12 avril", kind: "OVERBOUGHT_HOLD", outcome: "Validée +2.1% J+5" },
      { date: "28 mars", kind: "BUY_ZONE_ENTERED", outcome: "Validée +6.8% J+10" },
    ],
  },
  // ========================================
  // TIMELINE événements récents (Tableau)
  // ========================================
  timeline: [
    { time: "Aujourd'hui", events: [
      { title: "3 plans d'ordres prêts", subtitle: "ISRG · OR.PA · AI", color: "forest" },
      { title: "5 alertes envoyées", subtitle: "1 critique · 3 hautes · 1 info", color: "amber" },
      { title: "Pipeline V3.7 OK", subtitle: "Cron daily 22:30 UTC", color: "forest" },
    ]},
    { time: "Hier", events: [
      { title: "MELI flash drop -12.7%", subtitle: "Sans catalyseur identifié", color: "burgundy" },
      { title: "MSCI World +0.3%", subtitle: "Breadth en contraction", color: "neutral" },
    ]},
  ],
  // ========================================
  // DEV/ADMIN — Monitoring opérationnel (mock)
  // ========================================
  dev: {
    pipeline: {
      engine: "V3.7",
      regime: "BULL_LIGHT × 0.85",
      lastDailyRun: "9 mai · 22:30 UTC",
      nextRun: "10 mai · 22:30 UTC",
      status: "OK",
    },
    crons: [
      { name: "pipeline_daily_v37", schedule: "0 22 * * *", lastRun: "9 mai 22:30", status: "OK", durationMs: 4820 },
      { name: "fx_rates_eod", schedule: "0 21 * * *", lastRun: "9 mai 21:01", status: "OK", durationMs: 1240 },
      { name: "telegram_dispatch", schedule: "*/15 * * * *", lastRun: "9 mai 23:30", status: "OK", durationMs: 380 },
      { name: "alert_outcomes_j1", schedule: "0 23 * * *", lastRun: "9 mai 23:01", status: "OK", durationMs: 920 },
      { name: "alert_outcomes_j5", schedule: "0 23 * * *", lastRun: "9 mai 23:02", status: "OK", durationMs: 1180 },
      { name: "yahoo_scout_flash", schedule: "*/5 * * * *", lastRun: "9 mai 23:35", status: "OK", durationMs: 220 },
      { name: "engine_metrics_daily", schedule: "30 23 * * *", lastRun: "9 mai 23:30", status: "OK", durationMs: 640 },
      { name: "session_snapshot_auto", schedule: "0 4 * * *", lastRun: "9 mai 04:00", status: "OK", durationMs: 8200 },
      { name: "broker_sync_pea", schedule: "0 19 * * 1-5", lastRun: "8 mai 19:00", status: "OK", durationMs: 1820 },
      { name: "broker_sync_ibkr", schedule: "*/30 * * * *", lastRun: "9 mai 23:30", status: "OK", durationMs: 480 },
      { name: "broker_sync_tr", schedule: "0 19 * * 1-5", lastRun: "8 mai 19:01", status: "OK", durationMs: 740 },
      { name: "rls_audit_check", schedule: "0 6 * * *", lastRun: "9 mai 06:00", status: "OK", durationMs: 320 },
      { name: "engine_compare_v3_v35", schedule: "30 23 * * *", lastRun: "9 mai 23:30", status: "OK", durationMs: 2100 },
      { name: "agent_findings_archive", schedule: "0 5 * * 0", lastRun: "5 mai 05:00", status: "OK", durationMs: 1480 },
    ],
    telegram: {
      dispatchedToday: 5,
      lastDispatched: "9 mai 23:30",
      chatId: "73537xxx76",
      botActive: true,
      recent: [
        { time: "23:30", ticker: "MELI", kind: "FLASH_DROP", delivered: true },
        { time: "21:48", ticker: "CRWD", kind: "OVERBOUGHT", delivered: true },
        { time: "20:15", ticker: "NVDA", kind: "OVERBOUGHT", delivered: true },
        { time: "18:55", ticker: "PANX", kind: "OVERBOUGHT", delivered: true },
        { time: "18:20", ticker: "AI", kind: "BUY_ZONE", delivered: true },
      ],
    },
    alertsToday: {
      generated: 18,
      sent: 5,
      dismissed: 13,
      pendingJ1: 9,
      pendingJ5: 9,
    },
    accountsModes: [
      { name: "PEA Boursobank", mode: "MANUAL_ONLY", lastSync: "8 mai 19:00", status: "OK" },
      { name: "CTO IBKR principal", mode: "SEMI_AUTO", lastSync: "9 mai 23:30", status: "OK" },
      { name: "CTO IBKR sub-account", mode: "FULL_AUTO", lastSync: "9 mai 23:30", status: "PAPER" },
      { name: "CTO Trade Republic", mode: "MANUAL_ONLY", lastSync: "8 mai 19:01", status: "OK" },
    ],
    security: {
      rlsEnabled: 61,
      rlsTotal: 61,
      lastAudit: "9 mai 13:35",
      bypassRoles: ["postgres", "service_role"],
      blockedRoles: ["authenticated", "anon"],
    },
    eodhdMigration: {
      provider: "TD Pro → EODHD All-In-One",
      status: "shadow_mode",
      progress: 60,
      cutoverDate: "25 mai 2026",
      monthlySavings: "$58/mo",
    },
  },
};

/* ============================================================
   TOPNAV institutionnelle (sobre, underline active)
   ============================================================ */
const NexialLogo = ({ size = 30 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
    <div style={{
      width: size, height: size, backgroundColor: T.inkPrimary, borderRadius: 6,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontFamily: FONT_DISPLAY, fontSize: size * 0.55,
        color: T.inkOnDark, fontWeight: 500, letterSpacing: "-0.02em",
      }}>N</span>
    </div>
    <span style={{
      fontFamily: FONT_DISPLAY, fontSize: 20,
      color: T.inkPrimary, fontWeight: 500, letterSpacing: "-0.02em",
    }}>Nexial</span>
  </div>
);

const TopNavItem = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    position: "relative",
    padding: "16px 18px",
    border: "none", background: "transparent",
    color: active ? T.forestGreen : T.inkTertiary,
    fontFamily: FONT_SANS, fontSize: 13,
    fontWeight: active ? 700 : 500,
    letterSpacing: active ? "-0.005em" : "-0.005em",
    cursor: "pointer", transition: "color 200ms ease",
  }}>
    {label}
    {active && (
      <span style={{
        position: "absolute", bottom: -1, left: 18, right: 18,
        height: 2, backgroundColor: T.forestGreen, borderRadius: 1,
      }} />
    )}
  </button>
);

const TopNav = ({ active = "today", onNavigate = () => {} }) => (
  <nav style={{
    position: "sticky", top: 0, zIndex: 50,
    backgroundColor: T.bgCanvas, borderBottom: `1px solid ${T.borderUltra}`,
    backdropFilter: "saturate(140%) blur(8px)",
  }}>
    <div style={{
      maxWidth: CONTAINER_MAX, margin: "0 auto",
      padding: `0 ${CONTAINER_PAD}px`,
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: 32,
    }}>
      <NexialLogo size={28} />
      <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
        <TopNavItem label="Tableau" active={active === "dashboard"} onClick={() => onNavigate("dashboard")} />
        <TopNavItem label="Aujourd'hui" active={active === "today"} onClick={() => onNavigate("today")} />
        <TopNavItem label="Ordres" active={active === "orders"} onClick={() => onNavigate("orders")} />
        <TopNavItem label="Portefeuille" active={active === "portfolio"} onClick={() => onNavigate("portfolio")} />
        <TopNavItem label="Watchlist" active={active === "watchlist"} onClick={() => onNavigate("watchlist")} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <MarketStatusIndicator />
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary,
            letterSpacing: "0.04em", fontWeight: 600,
          }}>{MOCK.date.short}</div>
        </div>
        <button aria-label="Notifications" style={{
          position: "relative", width: 38, height: 38,
          border: `1px solid ${T.borderSubtle}`, background: T.bgSurface,
          borderRadius: 8, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: T.inkPrimary,
        }}>
          <Bell size={16} strokeWidth={2} />
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18, padding: "0 4px",
            borderRadius: 9, backgroundColor: T.burgundy,
            color: T.inkOnDark, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${T.bgCanvas}`, fontFamily: FONT_MONO,
          }}>5</span>
        </button>
      </div>
    </div>
  </nav>
);

const RefreshButton = ({ onRefresh, refreshing = false, label = "Rafraichir" }) => (
  <button
    type="button"
    onClick={onRefresh}
    disabled={refreshing}
    aria-label={label}
    title={label}
    style={{
      width: 38, height: 38, borderRadius: 8,
      border: `1px solid ${T.borderSubtle}`, backgroundColor: T.bgSurface,
      color: refreshing ? T.forestGreen : T.inkSecondary,
      cursor: refreshing ? "default" : "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      opacity: refreshing ? 0.75 : 1,
    }}
  >
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <RefreshCw size={16} strokeWidth={2.2} style={{ animation: refreshing ? "spin 900ms linear infinite" : "none" }} />
  </button>
);

const useManualRefresh = (refetch) => {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (typeof refetch === "function") await refetch();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };
  return { refreshing, handleRefresh };
};

const getMarketStatus = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const utcTime = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (day === 0 || day === 6) {
    return {
      eu: { status: "CLOSED", label: "Ferme weekend", color: "#828794" },
      us: { status: "CLOSED", label: "Ferme weekend", color: "#828794" },
    };
  }

  const euOpen = 7 * 60;
  const euClose = 15 * 60 + 30;
  const eu = (utcTime >= euOpen && utcTime <= euClose)
    ? { status: "OPEN", label: "Ouvert", color: "#2D5F3F" }
    : utcTime < euOpen
      ? { status: "PRE_MARKET", label: "Pre-market", color: "#C9A14A" }
      : { status: "CLOSED", label: "Ferme", color: "#828794" };

  const usOpen = 13 * 60 + 30;
  const usClose = 20 * 60;
  const usPreMarketStart = 8 * 60;
  const us = (utcTime >= usOpen && utcTime <= usClose)
    ? { status: "OPEN", label: "Ouvert", color: "#2D5F3F" }
    : (utcTime >= usPreMarketStart && utcTime < usOpen)
      ? { status: "PRE_MARKET", label: "Pre-market", color: "#C9A14A" }
      : (utcTime > usClose)
        ? { status: "AFTER_HOURS", label: "After-hours", color: "#C9A14A" }
        : { status: "CLOSED", label: "Ferme", color: "#828794" };

  return { eu, us };
};

const MarketStatusPill = ({ label, status }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700,
    color: status.color, whiteSpace: "nowrap",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: status.color }} />
    <span>{label}</span>
    <span style={{ color: T.inkTertiary }}>{status.label}</span>
  </div>
);

const MarketStatusIndicator = () => {
  const [status, setStatus] = useState(getMarketStatus);

  useEffect(() => {
    const interval = setInterval(() => setStatus(getMarketStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 9px", backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
    }}>
      <MarketStatusPill label="EU" status={status.eu} />
      <MarketStatusPill label="US" status={status.us} />
    </div>
  );
};

/* ============================================================
   SECTION 1 — Hero éditorial asymétrique
   ============================================================ */
const HeroEditorial = () => {
  const calendrier = [
    { date: "11 mai", label: "Reprise pipeline", tone: "gold" },
    { date: "13 mai", label: "J+5 outcomes", tone: "gold" },
    { date: "22 mai", label: "Expirations GTC", tone: "warning" },
    { date: "1 juin", label: "Reprise salariat", tone: "forest" },
  ];
  const toneStyle = (tone) => {
    if (tone === "forest") return { bg: T.bgPour, fg: T.forestGreen, dot: T.forestGreen };
    if (tone === "gold") return { bg: "rgba(125,102,40,0.10)", fg: T.gold, dot: T.gold };
    if (tone === "warning") return { bg: T.bgAlert, fg: T.amber, dot: T.amber };
    return { bg: T.bgSubtle, fg: T.inkSecondary, dot: T.inkTertiary };
  };
  return (
    <header style={{
      paddingTop: 44, paddingBottom: 36,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 56, alignItems: "end",
      }}>
        <div>
          <Eyebrow color={T.inkTertiary}>{MOCK.date.full}</Eyebrow>
          <h1 style={{
            margin: "12px 0 10px 0",
            fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 400,
            color: T.forestGreen, lineHeight: 1.05,
            letterSpacing: "-0.028em",
          }}>Bonjour {MOCK.user.name}.</h1>
          <p style={{
            margin: 0, maxWidth: 640,
            fontFamily: FONT_DISPLAY, fontSize: 18, fontStyle: "italic",
            fontWeight: 400, color: T.inkSecondary,
            lineHeight: 1.45, letterSpacing: "-0.005em",
          }}>
            Trois actions vous attendent lundi. Le marché clôture en consolidation,
            votre portefeuille tient ses gains.
          </p>
        </div>
        <div style={{
          paddingLeft: 28,
          borderLeft: `1px solid ${T.borderUltra}`,
          display: "flex", flexDirection: "column", gap: 8, minWidth: 220,
        }}>
          <Eyebrow color={T.inkTertiary}>Calendrier</Eyebrow>
          {calendrier.map((c) => {
            const s = toneStyle(c.tone);
            return (
              <div key={c.date} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px",
                backgroundColor: s.bg, borderRadius: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  backgroundColor: s.dot, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 11, color: s.fg,
                  letterSpacing: "0.02em", fontWeight: 700, minWidth: 50,
                }}>{c.date}</span>
                <span style={{
                  fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
                  fontWeight: 500,
                }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

/* ============================================================
   SECTION 2 — Portfolio signature pleine largeur
   ============================================================ */
/* ============================================================
   BANNEAU REGIME (signature couleur, comme mobile validé)
   ============================================================ */
const RegimeBanner = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 16,
    padding: "14px 20px", marginTop: 28,
    backgroundColor: T.bgPour,
    border: `1px solid ${T.borderUltra}`,
    borderRadius: 10,
  }}>
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      backgroundColor: T.forestGreen, flexShrink: 0,
    }} />
    <span style={{
      fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600,
      color: T.inkPrimary,
    }}>Marché en hausse modérée</span>
    <span style={{
      flex: 1, fontFamily: FONT_SANS, fontSize: 12.5,
      color: T.inkSecondary, fontWeight: 500,
    }}>Sizing global réduit de 15% jusqu'à clarification du leadership sectoriel.</span>
    <span style={{
      fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 700,
      color: T.forestGreen, letterSpacing: "0.02em",
    }}>sizing ×{MOCK.regime.multiplier}</span>
  </div>
);

const SignaturePortfolio = () => {
  const accountAccent = (i) => i === 0 ? T.forestGreen : i === 1 ? T.gold : T.amber;
  return (
  <section style={{
    paddingTop: 36, paddingBottom: 40,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{
      position: "relative",
      backgroundColor: T.bgPour,
      border: `1px solid rgba(31,74,46,0.15)`,
      borderRadius: 14,
      padding: "28px 32px 24px 36px",
    }}>
      {/* Accent bar verticale gauche forest */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        backgroundColor: T.forestGreen, borderRadius: "14px 0 0 14px",
      }} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        gap: 56, alignItems: "baseline", marginBottom: 24,
      }}>
        <div>
          <Eyebrow color={T.forestGreen}>Total · EUR</Eyebrow>
          <div style={{
            marginTop: 10,
            fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 400,
            color: T.inkPrimary, lineHeight: 0.95,
            letterSpacing: "-0.028em",
          }}>€{fmtEur(MOCK.portfolio.total)}</div>
        </div>
        <div>
          <Eyebrow color={T.forestGreen}>12 mois</Eyebrow>
          <div style={{
            marginTop: 10, lineHeight: 1,
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400,
            color: T.forestGreen, letterSpacing: "-0.020em",
          }}>+{MOCK.portfolio.pnlPct.toFixed(1)}%</div>
          <div style={{
            marginTop: 6,
            fontFamily: FONT_MONO, fontSize: 11.5, color: T.inkSecondary,
            fontWeight: 600, letterSpacing: "0.01em",
          }}>+€{fmtEur(MOCK.portfolio.pnlEur)} · vs MSCI +12.8%</div>
        </div>
        <div style={{ justifySelf: "end", textAlign: "right" }}>
          <Eyebrow color={T.forestGreen}>Cash disponible</Eyebrow>
          <div style={{
            marginTop: 10, lineHeight: 1,
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.020em",
          }}>€{fmtEur(MOCK.portfolio.cashEur)}</div>
          <div style={{
            marginTop: 6,
            fontFamily: FONT_SANS, fontSize: 11, color: T.inkSecondary,
            fontWeight: 500,
          }}>Réservé · achat sur faiblesse</div>
        </div>
      </div>

      {/* Sparkline signature pleine largeur */}
      <div style={{ position: "relative", marginTop: 4 }}>
        <Sparkline data={MOCK.portfolio.series} benchmark={MOCK.portfolio.benchmark}
          height={68} fillGradient color={T.forestGreen} id="hero-portfolio" />
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8,
          fontFamily: FONT_MONO, fontSize: 9.5, color: T.forestGreen,
          letterSpacing: "0.04em", fontWeight: 700, opacity: 0.65,
        }}>
          {["Mai 25", "Juil", "Sept", "Nov", "Janv 26", "Mars", "Mai 26"].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div style={{
          position: "absolute", top: -10, right: 0,
          display: "flex", gap: 16,
          fontFamily: FONT_SANS, fontSize: 10, color: T.forestGreen,
          fontWeight: 600,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 2, backgroundColor: T.forestGreen, borderRadius: 1 }} />
            Portefeuille
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 0, borderTop: `1.5px dashed ${T.msciGray}` }} />
            MSCI World
          </span>
        </div>
      </div>
    </div>

    {/* Bandeau régime intégré */}
    <RegimeBanner />

    {/* 3 comptes en row tight avec accent bars colorées */}
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12, marginTop: 28,
    }}>
      {MOCK.portfolio.accounts.map((acc, i) => {
        const accent = accountAccent(i);
        return (
          <div key={acc.name} style={{
            position: "relative",
            padding: "14px 16px 14px 18px",
            backgroundColor: T.bgSurface,
            border: `1px solid ${T.borderUltra}`,
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              backgroundColor: accent,
            }} />
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase",
              color: accent, marginBottom: 3,
            }}>{acc.name}</div>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkQuaternary,
              fontWeight: 500, marginBottom: 8,
            }}>{acc.broker}</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
                color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1,
              }}>€{fmtEur(acc.value)}</div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, color: accent,
                fontWeight: 700,
              }}>{acc.share.toFixed(1)}%</div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
  );
};

/* ============================================================
   SECTION 3 — Contexte marché institutionnel
   ============================================================ */
const SectionContext = () => (
  <section style={{
    paddingTop: 44, paddingBottom: 36,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ marginBottom: 20 }}>
      <Eyebrow>I · Le contexte</Eyebrow>
      <h2 style={{
        margin: "10px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1.15,
        maxWidth: 720,
      }}>
        Marché en{" "}
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>consolidation</em>
        , breadth qui se contracte.
      </h2>
    </div>

    <p style={{
      margin: "0 0 24px 0", maxWidth: 760,
      fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 16.5,
      lineHeight: 1.55, color: T.inkSecondary, letterSpacing: "-0.005em",
      fontWeight: 400,
    }}>« {MOCK.regime.note} »</p>

    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12,
    }}>
      {MOCK.indices.map((idx, i) => {
        const isPos = idx.delta >= 0;
        const accent = isPos ? T.forestGreen : T.burgundy;
        return (
          <div key={idx.name} style={{
            position: "relative",
            padding: "14px 16px 14px 18px",
            backgroundColor: isPos ? T.bgPour : T.bgContre,
            border: `1px solid ${T.borderUltra}`,
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              backgroundColor: accent,
            }} />
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 8,
            }}>
              <span style={{
                fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
                letterSpacing: "0.10em", textTransform: "uppercase",
                color: accent,
              }}>{idx.name}</span>
              <MetricChip variant={isPos ? "positive" : "negative"}>
                {fmtPct(idx.delta)}
              </MetricChip>
            </div>
            <div style={{
              fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.inkPrimary, letterSpacing: "-0.020em",
              marginBottom: 10, lineHeight: 1,
            }}>{idx.value}</div>
            <Sparkline data={idx.series} height={24}
              color={accent}
              showFinalDot={false} strokeWidth={1.4} id={`idx-${i}`} />
          </div>
        );
      })}
    </div>
  </section>
);

/* ============================================================
   SECTION 4 — 3 actions du jour en mode magazine éditorial
   ============================================================ */
const ActionArticle = ({ action, index }) => {
  const accent = action.score >= 8 ? T.forestGreen : action.score >= 6 ? T.gold : T.burgundy;
  return (
    <article style={{
      paddingTop: 36, paddingBottom: 36,
      borderTop: index === 0 ? "none" : `1px solid ${T.borderUltra}`,
      position: "relative",
    }}>
      {/* Accent bar verticale gauche colorée */}
      <div style={{
        position: "absolute", left: -18, top: 36, bottom: 36,
        width: 3, backgroundColor: accent, borderRadius: "0 2px 2px 0",
      }} />

      <div style={{
        display: "grid", gridTemplateColumns: "300px 1fr",
        gap: 44, alignItems: "start",
      }}>
        {/* Col gauche · meta dense */}
        <div>
          <Eyebrow color={accent}>
            Action {String(index + 1).padStart(2, "0")} de 03
          </Eyebrow>
          <div style={{
            marginTop: 14,
            fontFamily: FONT_MONO, fontSize: 12,
            fontWeight: 700, color: T.inkPrimary,
            letterSpacing: "0.02em",
          }}>{action.ticker}</div>
          <h3 style={{
            margin: "6px 0 4px 0",
            fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.1,
          }}>{action.name}</h3>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
            fontWeight: 500, letterSpacing: "0.02em", marginBottom: 18,
          }}>{action.sector}</div>

          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 20,
          }}>
            <ScoreGauge value={action.score} max={10} size={56} />
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
                color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
              }}>{action.currency}{action.price.toFixed(2)}</div>
              <div style={{ marginTop: 6 }}>
                <MetricChip variant="negative">{fmtPct(action.delta)}</MetricChip>
              </div>
            </div>
          </div>

          <div style={{
            paddingTop: 16, borderTop: `1px solid ${T.borderUltra}`,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {action.reasons.map((r, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 9,
                fontFamily: FONT_SANS, fontSize: 12,
                color: T.inkSecondary, lineHeight: 1.4, fontWeight: 500,
              }}>
                <span style={{
                  width: 4, height: 4, borderRadius: "50%",
                  backgroundColor: accent, marginTop: 6, flexShrink: 0,
                }} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col droite · thèse + chart + paliers + CTA */}
        <div>
          <p style={{
            margin: "0 0 20px 0",
            fontFamily: FONT_DISPLAY, fontStyle: "italic",
            fontSize: 18, lineHeight: 1.5,
            color: T.inkPrimary, letterSpacing: "-0.005em",
          }}>« {action.thesis} »</p>

          <div style={{
            padding: 18,
            backgroundColor: action.score >= 8 ? "rgba(31,74,46,0.04)" : action.score >= 6 ? "rgba(125,102,40,0.045)" : "rgba(139,94,10,0.04)",
            border: `1px solid ${action.score >= 8 ? "rgba(31,74,46,0.15)" : action.score >= 6 ? "rgba(125,102,40,0.18)" : "rgba(139,94,10,0.15)"}`,
            borderRadius: 12, marginBottom: 14,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 12,
            }}>
              <Eyebrow color={T.inkTertiary}>Cours · 90 jours</Eyebrow>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 10.5, color: T.inkTertiary,
                fontWeight: 600,
              }}>
                {action.currency}{Math.max(...action.series).toFixed(0)}
                {" → "}
                {action.currency}{Math.min(...action.series).toFixed(0)}
              </span>
            </div>
            <Sparkline data={action.series} height={88}
              color={accent} fillGradient strokeWidth={1.5}
              id={`action-${index}`} />

            <div style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: `repeat(${action.paliers.length}, 1fr)`,
              gap: 10,
            }}>
              {action.paliers.map((p) => {
                const palierColor =
                  p.rank === "P1" || p.rank === "Watch" ? T.forestGreen :
                  p.rank === "P2" ? T.gold : T.burgundy;
                return (
                  <div key={p.rank} style={{
                    padding: "10px 12px",
                    backgroundColor: T.bgSubtle,
                    borderRadius: 6,
                    borderLeft: `3px solid ${palierColor}`,
                  }}>
                    <div style={{
                      fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700,
                      color: palierColor, letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}>{p.rank}</div>
                    <div style={{
                      fontFamily: FONT_MONO, fontSize: 13, color: T.inkPrimary,
                      marginTop: 3, fontWeight: 700,
                    }}>{action.currency}{p.price}</div>
                    <div style={{
                      fontFamily: FONT_SANS, fontSize: 10,
                      color: T.inkTertiary, marginTop: 1, fontWeight: 500,
                    }}>{p.qty} pcs · {p.weight}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
            <button style={{
              padding: "11px 18px",
              backgroundColor: T.inkPrimary, color: T.inkOnDark,
              border: "none", borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
              letterSpacing: "-0.005em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Valider · ordre limite {action.currency}{action.paliers[0].price}
              <ArrowUpRight size={13} strokeWidth={2.2} />
            </button>
            <button style={{
              padding: "11px 16px",
              backgroundColor: "transparent", color: T.inkPrimary,
              border: `1.5px solid ${T.inkPrimary}`, borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}>Détails ↗</button>
            <button style={{
              padding: "11px 16px",
              backgroundColor: "transparent", color: T.inkPrimary,
              border: `1.5px solid ${T.inkPrimary}`, borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}>Reporter</button>
          </div>
        </div>
      </div>
    </article>
  );
};

const SectionActions = () => (
  <section style={{ borderBottom: `1px solid ${T.borderUltra}` }}>
    <div style={{ paddingTop: 44, paddingBottom: 12 }}>
      <Eyebrow>II · Les actions du jour</Eyebrow>
      <h2 style={{
        margin: "10px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1.15,
        maxWidth: 800,
      }}>
        Trois entrées{" "}
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>asymétriques</em>
        {" "}sur trois compounders solides.
      </h2>
    </div>
    {MOCK.actions.map((a, i) => (
      <ActionArticle key={a.ticker} action={a} index={i} />
    ))}
  </section>
);

/* ============================================================
   SECTION 5 — Portefeuille snapshot (Top contributeurs / Détracteurs)
   ============================================================ */
const SectionMovers = () => (
  <section style={{
    paddingTop: 44, paddingBottom: 36,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ marginBottom: 24 }}>
      <Eyebrow>III · Ton portefeuille</Eyebrow>
      <h2 style={{
        margin: "10px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1.15,
      }}>
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>Quatre positions</em>
        {" "}portent les gains.
      </h2>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{
        padding: "20px 24px",
        backgroundColor: T.bgPour,
        borderRadius: 12,
        border: `1px solid ${T.borderUltra}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ArrowUpRight size={13} color={T.forestGreen} strokeWidth={2.2} />
          <Eyebrow color={T.forestGreen}>Top contributeurs</Eyebrow>
        </div>
        {MOCK.contributors.map((c, i) => (
          <div key={c.ticker} style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr auto auto",
            gap: 14, alignItems: "center",
            padding: "10px 0",
            borderBottom: i < MOCK.contributors.length - 1 ? `1px solid rgba(0,0,0,0.06)` : "none",
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
              color: T.inkPrimary, letterSpacing: "0.02em",
            }}>{c.ticker}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary,
                fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.name}</div>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary,
                fontWeight: 600, letterSpacing: "0.04em",
                textTransform: "uppercase", marginTop: 1,
              }}>{c.account}</div>
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12, color: T.forestGreen,
              fontWeight: 700,
            }}>+€{fmtEur(c.pnlEur)}</span>
            <MetricChip variant="positive">{fmtPct(c.pnlPct)}</MetricChip>
          </div>
        ))}
      </div>

      <div style={{
        padding: "20px 24px",
        backgroundColor: T.bgContre,
        borderRadius: 12,
        border: `1px solid ${T.borderUltra}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ArrowDownRight size={13} color={T.burgundy} strokeWidth={2.2} />
          <Eyebrow color={T.burgundy}>Détracteurs</Eyebrow>
        </div>
        {MOCK.detractors.map((c, i) => (
          <div key={c.ticker} style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr auto auto",
            gap: 14, alignItems: "center",
            padding: "10px 0",
            borderBottom: i < MOCK.detractors.length - 1 ? `1px solid rgba(0,0,0,0.06)` : "none",
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
              color: T.inkPrimary, letterSpacing: "0.02em",
            }}>{c.ticker}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary,
                fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.name}</div>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary,
                fontWeight: 600, letterSpacing: "0.04em",
                textTransform: "uppercase", marginTop: 1,
              }}>{c.account}</div>
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12, color: T.burgundy,
              fontWeight: 700,
            }}>€{fmtEur(c.pnlEur)}</span>
            <MetricChip variant="negative">{fmtPct(c.pnlPct)}</MetricChip>
          </div>
        ))}
        <p style={{
          margin: "16px 0 0 0",
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: 13.5, color: T.inkSecondary,
          lineHeight: 1.45, letterSpacing: "-0.005em",
        }}>
          « Hermès et LVMH consolident après une année record. Thèses long-terme intactes. »
        </p>
      </div>
    </div>
  </section>
);

/* ============================================================
   SECTION 6 — Alertes du jour timeline éditoriale
   ============================================================ */
const DesktopDismissAlertModal = ({ alert, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setDismissing(true);
    setError(null);
    const result = await onConfirm(alert, reason.trim() || "manual_dismiss");
    if (result?.error) {
      setError(result.error);
      setDismissing(false);
      return;
    }
    setDismissing(false);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(10,10,10,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440, backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
        boxShadow: "0 22px 70px rgba(10,10,10,0.18)", padding: 22,
      }}>
        <h3 style={{
          margin: 0, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.015em",
        }}>Ignorer {alert.ticker} ?</h3>
        <p style={{
          margin: "8px 0 16px", fontFamily: FONT_SANS, fontSize: 13,
          color: T.inkSecondary, lineHeight: 1.45,
        }}>Cette alerte sera retiree de la timeline active.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Pourquoi ignores-tu cette alerte ?"
          rows={3}
          style={{
            width: "100%", resize: "vertical", border: `1px solid ${T.borderSubtle}`,
            borderRadius: 6, padding: 11, fontFamily: FONT_SANS, fontSize: 13,
            color: T.inkPrimary, backgroundColor: T.bgCanvas, outline: "none",
          }}
        />
        {error && (
          <div style={{
            marginTop: 10, padding: "9px 11px", borderRadius: 6,
            backgroundColor: T.bgContre, color: T.burgundy,
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
          }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={dismissing} style={{
            border: `1px solid ${T.borderSubtle}`, backgroundColor: "transparent",
            color: T.inkSecondary, borderRadius: 6, padding: "9px 13px",
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Annuler</button>
          <button type="button" onClick={handleConfirm} disabled={dismissing} style={{
            border: "none", backgroundColor: T.burgundy, color: T.inkOnDark,
            borderRadius: 6, padding: "9px 13px", fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 700, cursor: dismissing ? "default" : "pointer",
            opacity: dismissing ? 0.7 : 1,
          }}>{dismissing ? "Suppression..." : "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
};

const SectionAlerts = () => {
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState(MOCK.alerts);
  const [menuOpenForAlertId, setMenuOpenForAlertId] = useState(null);
  const [dismissModalForAlert, setDismissModalForAlert] = useState(null);
  const [actionError, setActionError] = useState(null);
  const visibleAlerts = useMemo(
    () => alerts.filter((a) => a.status !== "DISMISSED"),
    [alerts]
  );

  const handleMarkSeen = async (alertId) => {
    setActionError(null);
    if (isPersistedAlertId(alertId)) {
      const { error } = await supabase.rpc("fn_mark_alert_seen", { p_alert_id: alertId });
      if (error) {
        setActionError(error.message);
        return;
      }
    }
    setAlerts((items) => items.map((item) => (
      item.id === alertId ? { ...item, status: "SEEN" } : item
    )));
    setMenuOpenForAlertId(null);
  };

  const handleDismiss = async (alert, reason) => {
    setActionError(null);
    if (isPersistedAlertId(alert.id)) {
      const { error } = await supabase.rpc("fn_dismiss_alert", {
        p_alert_id: alert.id,
        p_reason: reason,
      });
      if (error) {
        setActionError(error.message);
        return { error: error.message };
      }
    }
    setAlerts((items) => items.map((item) => (
      item.id === alert.id ? { ...item, status: "DISMISSED" } : item
    )));
    setMenuOpenForAlertId(null);
    return { ok: true };
  };

  return (
  <section style={{
    paddingTop: 44, paddingBottom: 44,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ marginBottom: 24 }}>
      <Eyebrow>IV · Les alertes du jour</Eyebrow>
      <h2 style={{
        margin: "10px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1.15,
      }}>
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>{visibleAlerts.length} signaux</em>
        {" "}ont mérité d'être envoyés.
      </h2>
    </div>

    {actionError && (
      <div style={{
        marginBottom: 14, padding: "9px 11px", borderRadius: 8,
        backgroundColor: T.bgContre, color: T.burgundy,
        fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 700,
      }}>{actionError}</div>
    )}

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visibleAlerts.map((a, i) => {
        const sev =
          a.severity === "CRITICAL" ? "danger" :
          a.severity === "HIGH" ? "warning" :
          a.severity === "WARNING" ? "soft" : "outline";
        const sevColor =
          a.severity === "CRITICAL" ? T.burgundy :
          a.severity === "HIGH" ? T.amber :
          a.severity === "WARNING" ? T.gold : T.forestGreen;
        const sevBg =
          a.severity === "CRITICAL" ? T.bgContre :
          a.severity === "HIGH" ? T.bgAlert :
          a.severity === "WARNING" ? "rgba(125,102,40,0.06)" : T.bgPour;
        const freshness = getAlertFreshness(a.created_at, a.age_hours);
        const isSeen = a.status === "SEEN";
        return (
          <div key={a.id || i} style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "210px 1fr auto auto auto",
            gap: 28, alignItems: "center",
            padding: "14px 16px 14px 18px",
            backgroundColor: sevBg,
            border: `1px solid ${T.borderUltra}`,
            borderRadius: 8,
            overflow: "visible",
            opacity: isSeen ? 0.7 : 1,
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              backgroundColor: sevColor,
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, color: T.inkSecondary,
                fontWeight: 700, minWidth: 38,
              }}>{a.time}</span>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700,
                color: T.inkPrimary, letterSpacing: "0.02em", minWidth: 50,
              }}>{a.ticker}</span>
              <Badge variant={sev}>{a.kind.replace(/_/g, " ").toLowerCase()}</Badge>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                color: freshness.color, backgroundColor: `${freshness.color}14`,
                border: `1px solid ${freshness.color}33`, borderRadius: 999,
                padding: "2px 7px", textTransform: "uppercase",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: freshness.color }} />
                {freshness.tone} - {freshness.label}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary,
              lineHeight: 1.45, fontWeight: 500,
            }}>{a.message}</p>
            <MetricChip variant={a.delta >= 0 ? "negative" : "positive"}>
              {fmtPct(a.delta)}
            </MetricChip>
            <ChevronRight size={15} color={sevColor} strokeWidth={2} />
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Actions sur l'alerte"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenForAlertId((current) => current === a.id ? null : a.id);
                }}
                style={{
                  border: "none", backgroundColor: "transparent", color: T.inkTertiary,
                  width: 30, height: 30, borderRadius: 6, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <MoreHorizontal size={17} />
              </button>
              {menuOpenForAlertId === a.id && (
                <div style={{
                  position: "absolute", right: 0, top: 34, zIndex: 40, minWidth: 180,
                  backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
                  borderRadius: 8, boxShadow: "0 12px 36px rgba(10,10,10,0.12)", padding: 6,
                }}>
                  {a.status === "NEW" && (
                    <button type="button" onClick={() => handleMarkSeen(a.id)} style={{
                      width: "100%", border: "none", backgroundColor: "transparent",
                      color: T.inkSecondary, textAlign: "left", borderRadius: 6,
                      padding: "9px 10px", fontFamily: FONT_SANS, fontSize: 13,
                      fontWeight: 600, cursor: "pointer",
                    }}>Marquer comme vu</button>
                  )}
                  <button type="button" onClick={() => {
                    setMenuOpenForAlertId(null);
                    setDismissModalForAlert(a);
                  }} style={{
                    width: "100%", border: "none", backgroundColor: "transparent",
                    color: T.burgundy, textAlign: "left", borderRadius: 6,
                    padding: "9px 10px", fontFamily: FONT_SANS, fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                  }}>Ignorer</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
    {dismissModalForAlert && (
      <DesktopDismissAlertModal
        alert={dismissModalForAlert}
        onClose={() => setDismissModalForAlert(null)}
        onConfirm={handleDismiss}
      />
    )}
  </section>
  );
};

/* ============================================================
   SECTION 7 — Horizon (ce qui arrive)
   ============================================================ */
const SectionHorizon = () => (
  <section style={{ paddingTop: 44, paddingBottom: 56 }}>
    <div style={{ marginBottom: 24 }}>
      <Eyebrow>V · L'horizon</Eyebrow>
      <h2 style={{
        margin: "10px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1.15,
      }}>
        Ce qui arrive dans les{" "}
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>30 jours</em>
        .
      </h2>
    </div>

    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr",
      columnGap: 36, rowGap: 0,
    }}>
      {MOCK.horizon.map((h, i) => (
        <React.Fragment key={i}>
          <div style={{
            paddingTop: 14, paddingBottom: 14,
            borderTop: i === 0 ? `1px solid ${T.borderUltra}` : "none",
            borderBottom: `1px solid ${T.borderUltra}`,
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 400,
            color: T.forestGreen, letterSpacing: "-0.016em",
            minWidth: 120,
          }}>{h.date}</div>
          <div style={{
            paddingTop: 14, paddingBottom: 14,
            borderTop: i === 0 ? `1px solid ${T.borderUltra}` : "none",
            borderBottom: `1px solid ${T.borderUltra}`,
            display: "flex", alignItems: "center",
            fontFamily: FONT_SANS, fontSize: 13, color: T.inkSecondary,
            lineHeight: 1.5, fontWeight: 500,
          }}>{h.label}</div>
        </React.Fragment>
      ))}
    </div>
  </section>
);

/* ============================================================
   APP ROOT
   ============================================================ */
/* ============================================================
   PAGE — AUJOURD'HUI (cockpit éditorial v3 validé)
   ============================================================ */
const HOT_DECISION_KINDS = ["FLASH_DROP", "HOT_PULLBACK_ENTERED", "REVERSAL_HIGH", "OPPORTUNITY_DEEPENED"];
const RISK_DECISION_KINDS = ["DOWNTREND_DANGER_DETECTED", "OVERBOUGHT_HOLD_WARNING", "OVERBOUGHT_HOLD"];
const NEW_DECISION_STATUS = ["NEW"];
const ACTIVE_DECISION_STATUS = ["NEW", "SEEN"];
const REGIME_COLORS = {
  BULL: T.forestGreen,
  BULL_LIGHT: T.forestGreenLight,
  NEUTRAL: T.inkSecondary,
  CORRECTION: "#C9A14A",
  STRESS: T.burgundy,
};

const normalizeDecisionAlert = (alert) => ({
  id: alert.id,
  ticker: alert.ticker,
  alert_kind: alert.alert_kind || alert.kind,
  opportunity_score: Number(alert.opportunity_score ?? alert.score ?? 0),
  status: alert.status,
});

const useDecisionAlerts = (kinds, statuses) => {
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAlerts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .schema("nx")
        .from("investment_alerts")
        .select("id,ticker,alert_kind,status,opportunity_score,created_at,severity")
        .in("alert_kind", kinds)
        .in("status", statuses)
        .order("opportunity_score", { ascending: false, nullsFirst: false })
        .limit(5);

      if (cancelled) return;
      if (error || !data?.length) {
        const fallback = (MOCK.today?.alerts || [])
          .map(normalizeDecisionAlert)
          .filter((a) => kinds.includes(a.alert_kind) && statuses.includes(a.status))
          .sort((a, b) => b.opportunity_score - a.opportunity_score)
          .slice(0, 5);
        setAlerts(fallback);
      } else {
        setAlerts(data.map(normalizeDecisionAlert));
      }
      setLoading(false);
    };

    fetchAlerts();
    return () => { cancelled = true; };
  }, [kinds, statuses, supabase]);

  return { alerts, loading };
};

const MarketRegimeDecisionCard = ({ onClick }) => {
  const supabase = useMemo(() => createClient(), []);
  const [regime, setRegime] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("fn_get_latest_market_regime").then(({ data }) => {
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      setRegime(row || { market_regime: "BULL_LIGHT", suggested_sizing_multiplier: 0.85 });
    });
    return () => { cancelled = true; };
  }, [supabase]);

  const label = regime?.market_regime || "Chargement";
  const color = REGIME_COLORS[label] || T.inkSecondary;
  const multiplier = regime?.suggested_sizing_multiplier ?? regime?.sizing_multiplier;

  return (
    <button type="button" onClick={onClick} style={{
      textAlign: "left", padding: "20px 22px", backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderUltra}`, borderRadius: 12,
      cursor: "pointer", minHeight: 164,
    }}>
      <Eyebrow>Regime marche</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: T.inkPrimary, lineHeight: 1 }}>{label}</span>
      </div>
      <div style={{ marginTop: 14, fontFamily: FONT_MONO, fontSize: 12, color, fontWeight: 800 }}>
        {multiplier ? `sizing x${Number(multiplier).toFixed(2)}` : "sizing a verifier"}
      </div>
    </button>
  );
};

const AlertsDecisionCard = ({ title, kinds, statuses, tone = "hot", onClick, onAssetClick }) => {
  const { alerts, loading } = useDecisionAlerts(kinds, statuses);
  const color = tone === "risk" ? T.burgundy : T.forestGreen;

  return (
    <button type="button" onClick={onClick} style={{
      textAlign: "left", padding: "20px 22px", backgroundColor: tone === "risk" ? T.bgContre : T.bgPour,
      border: `1px solid ${T.borderUltra}`, borderRadius: 12,
      cursor: "pointer", minHeight: 164,
    }}>
      <Eyebrow color={color}>{title} ({loading ? "..." : alerts.length})</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
        {alerts.length === 0 ? (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkTertiary }}>
            {loading ? "Chargement..." : "Aucun signal"}
          </span>
        ) : alerts.map((alert) => (
          <div key={alert.id} onClick={(e) => { e.stopPropagation(); onAssetClick(alert.ticker); }} style={{
            display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 12, alignItems: "center",
            fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkPrimary,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 800 }}>{alert.ticker}</span>
            <span style={{ color: T.inkSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.alert_kind}</span>
            <span style={{ fontFamily: FONT_MONO, color, fontWeight: 800 }}>{Math.round(alert.opportunity_score)}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

const WealthDecisionCard = ({ onClick }) => {
  const { patrimoine, loading } = useTodayDashboard({ pollMs: 60000, limit: 1 });
  const total = patrimoine?.total_eur ?? MOCK.portfolio.total;
  const cash = patrimoine?.cash_eur ?? MOCK.portfolio.cashEur;
  const exposure = total > 0 ? ((patrimoine?.positions_eur ?? (total - cash)) / total) * 100 : 0;

  return (
    <button type="button" onClick={onClick} style={{
      textAlign: "left", padding: "20px 22px", backgroundColor: T.bgDarkPanel,
      border: `1px solid ${T.borderUltra}`, borderRadius: 12,
      cursor: "pointer", minHeight: 164,
    }}>
      <Eyebrow color={T.forestGreenOnDark}>Patrimoine</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 18 }}>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 10.5, color: T.forestGreenPale, textTransform: "uppercase", fontWeight: 800 }}>Total</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.inkOnDark, marginTop: 4 }}>{loading ? "..." : `EUR ${fmtEur(total)}`}</div>
        </div>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 10.5, color: T.forestGreenPale, textTransform: "uppercase", fontWeight: 800 }}>Cash</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.inkOnDark, marginTop: 4 }}>{loading ? "..." : `EUR ${fmtEur(cash)}`}</div>
        </div>
      </div>
      <div style={{ marginTop: 14, fontFamily: FONT_MONO, fontSize: 12, color: T.forestGreenOnDark, fontWeight: 800 }}>
        Exposition {loading ? "..." : `${exposure.toFixed(0)}%`}
      </div>
    </button>
  );
};

const DailyDecisionsSection = ({ onNavigate, onAssetClick }) => (
  <section style={{ paddingTop: 30, paddingBottom: 32, borderBottom: `1px solid ${T.borderUltra}` }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, marginBottom: 18 }}>
      <div>
        <Eyebrow color={T.forestGreen}>Decisions du jour</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.15,
        }}>Quatre points a verifier avant l'ouverture.</h2>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <MarketRegimeDecisionCard onClick={() => onNavigate("dashboard")} />
      <AlertsDecisionCard title="Opportunites chaudes" kinds={HOT_DECISION_KINDS} statuses={NEW_DECISION_STATUS} onClick={() => onNavigate("today")} onAssetClick={onAssetClick} />
      <AlertsDecisionCard title="Positions a risque" kinds={RISK_DECISION_KINDS} statuses={ACTIVE_DECISION_STATUS} tone="risk" onClick={() => onNavigate("today")} onAssetClick={onAssetClick} />
      <WealthDecisionCard onClick={() => onNavigate("portfolio")} />
    </div>
  </section>
);

const AujourdhuiPage = ({ onNavigate, onAssetClick }) => {
  const { refreshing, handleRefresh } = useManualRefresh(async () => {});
  return (
    <main style={{
      maxWidth: CONTAINER_MAX, margin: "0 auto",
      padding: `0 ${CONTAINER_PAD}px`,
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18 }}>
        <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
      </div>
      <HeroEditorial />
      <DailyDecisionsSection onNavigate={onNavigate} onAssetClick={onAssetClick} />
      <SignaturePortfolio />
      <SectionContext />
      <SectionActions />
      <SectionMovers />
      <SectionAlerts />
      <SectionHorizon />
    </main>
  );
};

/* ============================================================
   PAGE — TABLEAU (vue résumé desktop, dense, 2 cols)
   ============================================================ */
const TableauHeader = () => (
  <header style={{
    paddingTop: 36, paddingBottom: 24,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <Eyebrow color={T.inkTertiary}>{MOCK.date.full}</Eyebrow>
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
      <h1 style={{
        margin: 0,
        fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
        color: T.forestGreen, lineHeight: 1.05,
        letterSpacing: "-0.024em",
      }}>Tableau</h1>
      <span style={{
        fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18,
        color: T.inkSecondary, fontWeight: 400, letterSpacing: "-0.005em",
      }}>vue d'ensemble</span>
    </div>
  </header>
);

const TableauKPIs = () => (
  <section style={{
    paddingTop: 32, paddingBottom: 32,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{
      position: "relative",
      backgroundColor: T.bgPour,
      border: `1px solid rgba(31,74,46,0.15)`,
      borderRadius: 14,
      padding: "24px 28px 20px 32px",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        backgroundColor: T.forestGreen, borderRadius: "14px 0 0 14px",
      }} />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 32, alignItems: "baseline", marginBottom: 18,
      }}>
        <div>
          <Eyebrow color={T.forestGreen}>Patrimoine</Eyebrow>
          <div style={{
            marginTop: 8,
            fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.024em", lineHeight: 1,
          }}>€{fmtEur(MOCK.portfolio.total)}</div>
        </div>
        <div>
          <Eyebrow color={T.forestGreen}>Performance 12m</Eyebrow>
          <div style={{
            marginTop: 8,
            fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
            color: T.forestGreen, letterSpacing: "-0.020em", lineHeight: 1,
          }}>+{MOCK.portfolio.pnlPct.toFixed(1)}%</div>
          <div style={{
            marginTop: 4, fontFamily: FONT_MONO, fontSize: 11,
            color: T.inkSecondary, fontWeight: 600,
          }}>+€{fmtEur(MOCK.portfolio.pnlEur)}</div>
        </div>
        <div>
          <Eyebrow color={T.forestGreen}>Cash</Eyebrow>
          <div style={{
            marginTop: 8,
            fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
          }}>€{fmtEur(MOCK.portfolio.cashEur)}</div>
          <div style={{
            marginTop: 4, fontFamily: FONT_SANS, fontSize: 11,
            color: T.inkSecondary, fontWeight: 500,
          }}>16.7% du total</div>
        </div>
        <div>
          <Eyebrow color={T.forestGreen}>Régime</Eyebrow>
          <div style={{
            marginTop: 8,
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
            color: T.amber, letterSpacing: "-0.018em", lineHeight: 1,
          }}>BULL_LIGHT</div>
          <div style={{
            marginTop: 4, fontFamily: FONT_MONO, fontSize: 11,
            color: T.inkSecondary, fontWeight: 700,
          }}>sizing ×{MOCK.regime.multiplier}</div>
        </div>
      </div>
      <Sparkline data={MOCK.portfolio.series} benchmark={MOCK.portfolio.benchmark}
        height={56} fillGradient color={T.forestGreen} id="kpi-spark" />
    </div>
  </section>
);

const TableauComptes = () => {
  const accountAccent = (i) => i === 0 ? T.forestGreen : i === 1 ? T.gold : T.amber;
  return (
    <section style={{
      paddingTop: 32, paddingBottom: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>Comptes brokers</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>Trois comptes</em>
          {" "}actifs, un en lab.
        </h2>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
      }}>
        {MOCK.portfolio.accounts.map((acc, i) => {
          const accent = accountAccent(i);
          return (
            <div key={acc.name} style={{
              position: "relative",
              padding: "16px 20px 16px 22px",
              backgroundColor: T.bgSurface,
              border: `1px solid ${T.borderUltra}`,
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                backgroundColor: accent,
              }} />
              <div style={{
                fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.10em", textTransform: "uppercase",
                color: accent, marginBottom: 4,
              }}>{acc.name}</div>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 11, color: T.inkQuaternary,
                fontWeight: 500, marginBottom: 10,
              }}>{acc.broker}</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
                  color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
                }}>€{fmtEur(acc.value)}</div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 11.5, color: accent,
                  fontWeight: 700,
                }}>{acc.share.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const TableauTimeline = ({ onSeeAll }) => (
  <section style={{ paddingTop: 32, paddingBottom: 40 }}>
    <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
      <div>
      <Eyebrow>Activité récente</Eyebrow>
      <h2 style={{
        margin: "8px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.15,
      }}>
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>Ce qui s'est passé</em>
        {" "}depuis hier.
      </h2>
      </div>
      <button onClick={onSeeAll} style={{
        background: "none", border: "none", fontFamily: FONT_SANS,
        fontSize: 12, color: T.inkPrimary, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 2, padding: "2px 0",
        textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: T.borderHair,
        flexShrink: 0,
      }}>Tout voir<ChevronRight size={14} strokeWidth={2} /></button>
    </div>
    {MOCK.timeline.map((day, di) => (
      <div key={di} style={{ marginBottom: di === 0 ? 24 : 0 }}>
        <Eyebrow color={T.inkTertiary} style={{ display: "block", marginBottom: 12 }}>
          {day.time}
        </Eyebrow>
        {day.events.map((ev, ei) => {
          const c = ev.color === "forest" ? T.forestGreen :
                   ev.color === "amber" ? T.amber :
                   ev.color === "burgundy" ? T.burgundy : T.inkTertiary;
          const bg = ev.color === "forest" ? T.bgPour :
                    ev.color === "amber" ? T.bgAlert :
                    ev.color === "burgundy" ? T.bgContre : T.bgSubtle;
          return (
            <div key={ei} style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px 12px 18px",
              backgroundColor: bg,
              border: `1px solid ${T.borderUltra}`,
              borderRadius: 8,
              marginBottom: 6, overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                backgroundColor: c,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
                  color: T.inkPrimary,
                }}>{ev.title}</div>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkSecondary,
                  fontWeight: 500, marginTop: 2,
                }}>{ev.subtitle}</div>
              </div>
              <ChevronRight size={14} color={c} strokeWidth={2} />
            </div>
          );
        })}
      </div>
    ))}
  </section>
);

const TableauPage = ({ onNavigate }) => {
  const { refreshing, handleRefresh } = useManualRefresh(async () => {});
  const [dashboardContributors, dashboardDetractors] = useMemo(
    () => dedupeAssetGroups(MOCK.contributors, MOCK.detractors),
    []
  );

  return (
  <main style={{
    maxWidth: CONTAINER_MAX, margin: "0 auto",
    padding: `0 ${CONTAINER_PAD}px`,
  }}>
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18 }}>
      <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
    </div>
    <TableauHeader />
    <TableauKPIs />
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{ paddingTop: 32, paddingBottom: 32 }}>
        {/* Réutilise SectionMovers contributeurs/détracteurs */}
        <Eyebrow>Top contributeurs</Eyebrow>
        <h2 style={{
          margin: "8px 0 18px 0",
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>Quatre positions</em>
          {" "}portent.
        </h2>
        <div style={{
          padding: "16px 18px", backgroundColor: T.bgPour,
          border: `1px solid ${T.borderUltra}`, borderRadius: 12,
        }}>
          {dashboardContributors.map((c, i) => (
            <div key={assetReactKey(c, "dashboard-contributor", i)} style={{
              display: "grid", gridTemplateColumns: "56px 1fr auto auto",
              gap: 12, alignItems: "center", padding: "8px 0",
              borderBottom: i < dashboardContributors.length - 1 ? `1px solid rgba(0,0,0,0.06)` : "none",
            }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
                color: T.inkPrimary, letterSpacing: "0.02em",
              }}>{c.ticker}</span>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
                fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.name}</div>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11.5, color: T.forestGreen, fontWeight: 700,
              }}>+€{fmtEur(c.pnlEur)}</span>
              <MetricChip variant="positive">{fmtPct(c.pnlPct)}</MetricChip>
            </div>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 32, paddingBottom: 32 }}>
        <Eyebrow color={T.burgundy}>Détracteurs</Eyebrow>
        <h2 style={{
          margin: "8px 0 18px 0",
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.burgundy, fontStyle: "italic", fontWeight: 400 }}>Trois positions</em>
          {" "}consolident.
        </h2>
        <div style={{
          padding: "16px 18px", backgroundColor: T.bgContre,
          border: `1px solid ${T.borderUltra}`, borderRadius: 12,
        }}>
          {dashboardDetractors.map((c, i) => (
            <div key={assetReactKey(c, "dashboard-detractor", i)} style={{
              display: "grid", gridTemplateColumns: "56px 1fr auto auto",
              gap: 12, alignItems: "center", padding: "8px 0",
              borderBottom: i < dashboardDetractors.length - 1 ? `1px solid rgba(0,0,0,0.06)` : "none",
            }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
                color: T.inkPrimary, letterSpacing: "0.02em",
              }}>{c.ticker}</span>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
                fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.name}</div>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11.5, color: T.burgundy, fontWeight: 700,
              }}>€{fmtEur(c.pnlEur)}</span>
              <MetricChip variant="negative">{fmtPct(c.pnlPct)}</MetricChip>
            </div>
          ))}
        </div>
      </div>
    </div>
    <TableauComptes />
    <TableauTimeline onSeeAll={() => onNavigate("today")} />
  </main>
  );
};

/* ============================================================
   PAGE — ORDRES (paper trading, paliers étagés par ticker)
   ============================================================ */
const OrdresHeader = () => (
  <header style={{
    paddingTop: 36, paddingBottom: 24,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <Eyebrow color={T.inkTertiary}>{MOCK.date.full}</Eyebrow>
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
      <h1 style={{
        margin: 0,
        fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
        color: T.forestGreen, lineHeight: 1.05,
        letterSpacing: "-0.024em",
      }}>Ordres</h1>
      <span style={{
        fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18,
        color: T.inkSecondary, fontWeight: 400, letterSpacing: "-0.005em",
      }}>
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>6 paliers</em>
        {" "}en attente sur 2 tickers
      </span>
    </div>
  </header>
);

const OrderArticle = ({ order, index }) => {
  const accent = order.score >= 8 ? T.forestGreen : order.score >= 6 ? T.gold : T.burgundy;
  const totalEur = order.paliers.reduce((s, p) => s + p.qty * p.price, 0);
  return (
    <article style={{
      paddingTop: 36, paddingBottom: 36,
      borderBottom: `1px solid ${T.borderUltra}`,
      position: "relative",
    }}>
      <div style={{
        position: "absolute", left: -18, top: 36, bottom: 36,
        width: 3, backgroundColor: accent, borderRadius: "0 2px 2px 0",
      }} />
      <div style={{
        display: "grid", gridTemplateColumns: "260px 1fr",
        gap: 40, alignItems: "start",
      }}>
        <div>
          <Eyebrow color={accent}>Ordre {String(index + 1).padStart(2, "0")} de 02</Eyebrow>
          <div style={{
            marginTop: 14,
            fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.02em",
          }}>{order.ticker}</div>
          <h3 style={{
            margin: "6px 0 4px 0",
            fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.1,
          }}>{order.name}</h3>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginTop: 16,
          }}>
            <ScoreGauge value={order.score} max={10} size={52} />
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
                color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
              }}>{order.currency}{order.currentPrice.toFixed(2)}</div>
              <div style={{
                marginTop: 6, fontFamily: FONT_SANS, fontSize: 10.5,
                color: T.inkTertiary, fontWeight: 600,
              }}>cours actuel</div>
            </div>
          </div>
          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: `1px solid ${T.borderUltra}`,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600 }}>Quantité totale</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>{order.totalQty} pcs</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600 }}>Engagement max</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>{order.currency}{fmtEur(totalEur)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600 }}>Expire</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.amber, fontWeight: 700 }}>{order.expiresAt}</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{
            padding: 18,
            backgroundColor: order.score >= 8 ? "rgba(31,74,46,0.04)" : "rgba(125,102,40,0.045)",
            border: `1px solid ${T.borderUltra}`, borderRadius: 12,
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <Eyebrow color={accent}>Cours · 60 jours</Eyebrow>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 10.5, color: T.inkTertiary, fontWeight: 600,
              }}>3 paliers étagés sur faiblesse</span>
            </div>
            <Sparkline data={order.series} height={70}
              color={accent} fillGradient strokeWidth={1.5} id={`order-${index}`} />
          </div>

          {/* Paliers en colonnes denses */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${order.paliers.length}, 1fr)`,
            gap: 10, marginBottom: 14,
          }}>
            {order.paliers.map((p) => {
              const palierColor = p.rank === "P1" ? T.forestGreen :
                                 p.rank === "P2" ? T.gold : T.burgundy;
              const palierBg = p.rank === "P1" ? T.bgPour :
                              p.rank === "P2" ? "rgba(125,102,40,0.06)" : T.bgContre;
              return (
                <div key={p.rank} style={{
                  position: "relative",
                  padding: "12px 14px 12px 16px",
                  backgroundColor: palierBg,
                  border: `1px solid ${T.borderUltra}`,
                  borderRadius: 8, overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    backgroundColor: palierColor,
                  }} />
                  <div style={{
                    fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
                    color: palierColor, letterSpacing: "0.12em", textTransform: "uppercase",
                  }}>{p.rank}</div>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 16, color: T.inkPrimary,
                    marginTop: 4, fontWeight: 700,
                  }}>{order.currency}{p.price}</div>
                  <div style={{
                    fontFamily: FONT_SANS, fontSize: 10.5,
                    color: T.inkSecondary, marginTop: 4, fontWeight: 600,
                  }}>{p.qty} pcs · {p.weight}%</div>
                  <div style={{
                    marginTop: 8,
                    fontFamily: FONT_MONO, fontSize: 10.5,
                    color: p.dist === 0 ? T.forestGreen : T.inkTertiary, fontWeight: 700,
                  }}>{p.dist === 0 ? "Atteint" : `${fmtPct(p.dist)}`}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
            <button style={{
              padding: "12px 20px",
              backgroundColor: T.inkPrimary, color: T.inkOnDark,
              border: "none", borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              letterSpacing: "-0.005em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Valider les 3 paliers
              <ArrowUpRight size={13} strokeWidth={2.2} />
            </button>
            <button style={{
              padding: "12px 16px", background: "transparent", color: T.inkPrimary,
              border: `1.5px solid ${T.inkPrimary}`, borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Modifier</button>
            <button style={{
              padding: "12px 16px", background: "transparent", color: T.burgundy,
              border: `1.5px solid ${T.burgundy}`, borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
          </div>
        </div>
      </div>
    </article>
  );
};

const OrdresPage = () => (
  <main style={{
    maxWidth: CONTAINER_MAX, margin: "0 auto",
    padding: `0 ${CONTAINER_PAD}px`,
  }}>
    <OrdresHeader />
    {MOCK.paperOrders.map((order, i) => (
      <OrderArticle key={order.ticker} order={order} index={i} />
    ))}
    <div style={{ height: 40 }} />
  </main>
);

/* ============================================================
   PAGE — PORTEFEUILLE (tableau dense / cartes, sparklines inline)
   ============================================================ */
const formatPositionNumber = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatPositionMoney = (value, currency = "EUR", digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${formatPositionNumber(n, digits)} ${currency || "EUR"}`;
};

const PortfolioPerfSummary = ({ positions }) => {
  const totalValue = positions.reduce((sum, p) => sum + Number(p.marketValueNative || p.value || 0), 0);
  const weightedPnl = positions.reduce((sum, p) => {
    const weight = totalValue > 0 ? Number(p.marketValueNative || p.value || 0) / totalValue : 0;
    return sum + weight * Number(p.pnlPct || 0);
  }, 0);
  const winners = positions.filter((p) => Number(p.pnlPct || 0) >= 0).length;
  const losers = positions.filter((p) => Number(p.pnlPct || 0) < 0).length;
  const positive = weightedPnl >= 0;

  return (
    <section style={{
      marginTop: 18, padding: "14px 16px", backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderUltra}`, borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 24,
    }}>
      <div>
        <Eyebrow color={T.inkTertiary}>Synthese portefeuille</Eyebrow>
        <div style={{
          marginTop: 5, fontFamily: FONT_SANS, fontSize: 13,
          color: T.inkSecondary, fontWeight: 600,
        }}>{positions.length} positions - {winners} gagnantes / {losers} perdantes</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400,
          color: positive ? T.forestGreen : T.burgundy,
          letterSpacing: "-0.02em",
        }}>{positive ? "+" : ""}{weightedPnl.toFixed(2)}%</div>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
        }}>P&L moyen pondere</div>
      </div>
    </section>
  );
};

const PortefeuilleHeader = ({ totalValue, totalPositions, accounts, account, setAccount, viewMode, setViewMode, onAddPosition }) => (
  <header style={{
    paddingTop: 36, paddingBottom: 24,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 32 }}>
      <div>
        <Eyebrow color={T.inkTertiary}>{MOCK.date.full}</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
          <h1 style={{
            margin: 0,
            fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
            color: T.forestGreen, lineHeight: 1.05,
            letterSpacing: "-0.024em",
          }}>Portefeuille</h1>
          <span style={{
            fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18,
            color: T.inkSecondary, fontWeight: 400, letterSpacing: "-0.005em",
          }}>
            <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>{totalPositions} positions</em>
            {" "}· €{fmtEur(totalValue)}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onAddPosition} style={{
          padding: "9px 14px", border: "none", backgroundColor: T.inkPrimary,
          color: T.inkOnDark, borderRadius: 8, cursor: "pointer",
          fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Plus size={14} strokeWidth={2.3} />Ajouter
        </button>
        <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: T.bgSubtle, borderRadius: 8 }}>
        <button onClick={() => setViewMode("list")} style={{
          padding: "8px 12px", border: "none",
          backgroundColor: viewMode === "list" ? T.bgSurface : "transparent",
          boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          borderRadius: 6, cursor: "pointer", color: viewMode === "list" ? T.inkPrimary : T.inkTertiary,
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
        }}>
          <List size={13} strokeWidth={2} /> Liste
        </button>
        <button onClick={() => setViewMode("card")} style={{
          padding: "8px 12px", border: "none",
          backgroundColor: viewMode === "card" ? T.bgSurface : "transparent",
          boxShadow: viewMode === "card" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          borderRadius: 6, cursor: "pointer", color: viewMode === "card" ? T.inkPrimary : T.inkTertiary,
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
        }}>
          <LayoutGrid size={13} strokeWidth={2} /> Cartes
        </button>
        </div>
      </div>
    </div>

    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
      {[{ account_id: "all", account_name: "Tous", positions_count: totalPositions }, ...accounts].map((f) => {
        const active = account === f.account_id;
        const count = f.positions_count ?? 0;
        return (
          <button key={f.account_id} onClick={() => setAccount(f.account_id)} style={{
            padding: "7px 14px",
            backgroundColor: active ? T.forestGreen : "transparent",
            color: active ? T.inkOnDark : T.inkSecondary,
            border: `1px solid ${active ? T.forestGreen : T.borderHair}`,
            borderRadius: 20, cursor: "pointer",
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {f.account_name}
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
              color: active ? T.forestGreenPale : T.inkQuaternary,
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  </header>
);

const PortefeuilleTable = ({ positions, onAssetClick }) => (
  <section style={{ paddingTop: 16, paddingBottom: 32 }}>
    {/* Header tableau */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "60px 1.35fr 0.9fr 60px 85px 85px 105px 100px 80px 90px 20px",
      gap: 12, alignItems: "center",
      padding: "12px 16px",
      borderBottom: `1px solid ${T.borderHair}`,
    }}>
      {["Ticker", "Nom", "Compte", "Qty", "PRU", "Prix", "Valeur", "P&L", "P&L %", "90 jours", ""].map((h, i) => (
        <span key={i} style={{
          fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase",
          color: T.inkTertiary,
          textAlign: ["Qty", "PRU", "Prix", "Valeur", "P&L"].includes(h) ? "right" : "left",
        }}>{h}</span>
      ))}
    </div>
    {positions.map((p, i) => {
      const isPos = p.pnlPct >= 0;
      const accent = isPos ? T.forestGreen : T.burgundy;
      return (
        <div key={p.ticker} onClick={() => onAssetClick(p.ticker)} style={{
          display: "grid",
          gridTemplateColumns: "60px 1.35fr 0.9fr 60px 85px 85px 105px 100px 80px 90px 20px",
          gap: 12, alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${T.borderUltra}`,
          cursor: "pointer", transition: "background-color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.02em",
          }}>{p.ticker}</span>
          <div>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary, fontWeight: 600,
            }}>{p.name}</div>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary, fontWeight: 500,
              letterSpacing: "0.02em", marginTop: 1,
            }}>{p.sector}</div>
          </div>
          <span style={{
            fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
            fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>{p.account}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: T.inkSecondary,
            fontWeight: 600, textAlign: "right",
          }}>{formatPositionNumber(p.qty, 4)}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: T.inkSecondary,
            fontWeight: 600, textAlign: "right",
          }}>{formatPositionMoney(p.avgCost, p.currency)}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: T.inkSecondary,
            fontWeight: 600, textAlign: "right",
          }}>{formatPositionMoney(p.price, p.currency)}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 13, color: T.inkPrimary,
            fontWeight: 700, textAlign: "right",
          }}>{formatPositionMoney(p.marketValueNative, p.currency, 0)}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: accent,
            fontWeight: 700, textAlign: "right",
          }}>{isPos ? "+" : ""}{formatPositionMoney(p.pnlNative, p.currency, 0)}</span>
          <div style={{ textAlign: "right" }}>
            <MetricChip variant={isPos ? "positive" : "negative"}>{fmtPct(p.pnlPct)}</MetricChip>
          </div>
          <div style={{ width: 110, height: 28 }}>
            <Sparkline data={p.series} height={28} color={accent}
              showFinalDot={false} strokeWidth={1.2} id={`pos-${i}`} />
          </div>
          <ChevronRight size={14} color={T.inkQuaternary} strokeWidth={1.5} />
        </div>
      );
    })}
  </section>
);

const PortefeuilleCard = ({ position, onClick, index }) => {
  const isPos = position.pnlPct >= 0;
  const accent = isPos ? T.forestGreen : T.burgundy;
  const bg = isPos ? T.bgPour : T.bgContre;
  return (
    <div onClick={onClick} style={{
      position: "relative",
      padding: "16px 18px 14px 20px",
      backgroundColor: bg,
      border: `1px solid ${T.borderUltra}`,
      borderRadius: 12, cursor: "pointer", overflow: "hidden",
      transition: "transform 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        backgroundColor: accent,
      }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 4,
      }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "0.02em",
        }}>{position.ticker}</span>
        <MetricChip variant={isPos ? "positive" : "negative"}>{fmtPct(position.pnlPct)}</MetricChip>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkSecondary,
        fontWeight: 500, marginBottom: 12,
      }}>{position.name}</div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        marginBottom: 12, fontFamily: FONT_MONO, fontSize: 10.5,
        color: T.inkSecondary, fontWeight: 700,
      }}>
        <span>Qty {formatPositionNumber(position.qty, 4)}</span>
        <span>PRU {formatPositionMoney(position.avgCost, position.currency)}</span>
        <span>Prix {formatPositionMoney(position.price, position.currency)}</span>
        <span>Val. {formatPositionMoney(position.marketValueNative, position.currency, 0)}</span>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
      }}>€{fmtEur(position.value)}</div>
      <div style={{
        marginTop: 4, fontFamily: FONT_MONO, fontSize: 11,
        color: accent, fontWeight: 700,
      }}>{isPos ? "+" : ""}€{fmtEur(position.pnlEur)}</div>
      <div style={{ marginTop: 10, height: 32 }}>
        <Sparkline data={position.series} height={32} color={accent}
          fillGradient strokeWidth={1.3} id={`card-${index}`} />
      </div>
    </div>
  );
};

const SUPPORTED_POSITION_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "HKD"];
const nowForDatetimeInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const AssetSearchInput = ({ onSelect, onQueryChange, placeholder = "Rechercher un asset...", initialValue = "" }) => {
  const { query, setQuery, results, loading, error } = useAssetSearch({ debounceMs: 250 });
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue, setQuery]);

  const handleSelect = (asset, isExternal = false) => {
    const selected = isExternal ? { ...asset, isExternal: true } : asset;
    setQuery(`${asset.ticker} - ${asset.asset_name || asset.name || ""}`.trim());
    setShowSuggestions(false);
    onSelect(selected);
  };

  const suggestions = [
    ...(results.internal || []).map((asset) => ({ asset, isExternal: false, key: asset.asset_id || asset.id })),
    ...(results.external || []).map((asset) => ({ asset, isExternal: true, key: `ext:${asset.ticker}:${asset.exchange_mic || ""}` })),
  ];

  return (
    <div style={{ position: "relative" }}>
      <Search size={14} strokeWidth={2} color={T.inkTertiary} style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
          if (typeof onQueryChange === "function") onQueryChange(e.target.value);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 34px",
          border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
          fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary,
          backgroundColor: T.bgCanvas, outline: "none",
        }}
      />
      {loading && (
        <span style={{
          position: "absolute", right: 12, top: 11,
          fontFamily: FONT_MONO, fontSize: 12, color: T.inkTertiary,
        }}>...</span>
      )}
      {showSuggestions && query.trim().length >= 2 && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, maxHeight: 320, overflowY: "auto",
          backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
          borderRadius: 8, boxShadow: "0 12px 36px rgba(10,10,10,0.12)",
        }}>
          {suggestions.map(({ asset, isExternal, key }) => (
            <div
              key={key}
              onMouseDown={() => handleSelect(asset, isExternal)}
              style={{
                padding: "10px 12px", cursor: "pointer",
                borderBottom: `1px solid ${T.borderSubtle}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.bgSurface}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary }}>{asset.ticker}</strong>
                <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, whiteSpace: "nowrap" }}>
                  {[asset.exchange_mic, asset.currency].filter(Boolean).join(" - ")}
                </span>
              </div>
              <div style={{ marginTop: 2, fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary }}>
                {asset.asset_name || asset.name}
              </div>
              {(asset.sector || asset.asset_class) && (
                <div style={{ marginTop: 2, fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary }}>
                  {asset.sector || asset.asset_class}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showSuggestions && query.trim().length >= 2 && !loading && suggestions.length === 0 && !error && (
        <div style={{ marginTop: 6, fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>
          Aucun asset trouve.
        </div>
      )}
      {error && <div style={{ marginTop: 5, fontFamily: FONT_SANS, fontSize: 11.5, color: T.burgundy }}>{error}</div>}
    </div>
  );
};

const AddPositionModal = ({ open, onClose, onSuccess }) => {
  const supabase = useMemo(() => createClient(), []);
  const { patrimoine } = useTodayDashboard({ pollMs: 60000, limit: 1 });
  const { query, setQuery, results, loading, error: searchError, createUserAsset } = useAssetSearch({ debounceMs: 250 });
  const accounts = useMemo(
    () => (patrimoine?.accounts || []).filter((a) => a.is_active && a.universe !== "PAPER_TRADING"),
    [patrimoine]
  );
  const [kind, setKind] = useState("buy");
  const [accountId, setAccountId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [executedAt, setExecutedAt] = useState(nowForDatetimeInput);
  const [fees, setFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  if (!open) return null;

  const effectiveAccountId = accountId || accounts[0]?.account_id || "";
  const selectedAccount = accounts.find((a) => a.account_id === effectiveAccountId);
  const validate = () => {
    const next = {};
    const executed = new Date(executedAt);
    const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (!selectedAccount) next.account = "Compte requis";
    if (!selectedAsset) next.asset = "Asset requis";
    if (!(Number(quantity) > 0)) next.quantity = "QuantitÃ© > 0 requise";
    if (!(Number(unitPrice) > 0)) next.unitPrice = "Prix unitaire > 0 requis";
    if (!(Number(fees) >= 0)) next.fees = "Frais >= 0 requis";
    if (!SUPPORTED_POSITION_CURRENCIES.includes(currency)) next.currency = "Devise non supportÃ©e";
    if (!executedAt || Number.isNaN(executed.getTime()) || executed.getFullYear() < 2000 || executed > maxDate) {
      next.executedAt = "Date d'exÃ©cution invalide";
    }
    return next;
  };
  const currentErrors = validate();
  const submitDisabled = submitting || Object.keys(currentErrors).length > 0;

  const selectAsset = (asset) => {
    setSelectedAsset(asset);
    setCurrency(asset.currency || "EUR");
    setErrors((prev) => ({ ...prev, asset: null }));
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setSuccess(null);
    try {
      let assetId = selectedAsset.asset_id || selectedAsset.id;
      if (!assetId && selectedAsset.isExternal) assetId = await createUserAsset(selectedAsset);
      const { data, error } = await supabase.schema("nx").rpc("fn_add_manual_position", {
        p_account_id: selectedAccount.account_id,
        p_asset_id: assetId,
        p_event_kind: kind,
        p_quantity: Number(quantity),
        p_unit_price: Number(unitPrice),
        p_currency: currency,
        p_executed_at: new Date(executedAt).toISOString(),
        p_fees: Number(fees) || 0,
        p_taxes: 0,
        p_notes: notes.trim() || null,
      });
      if (error) {
        setErrors({ submit: error.message });
        return;
      }
      const result = Array.isArray(data) ? data[0] : data;
      setSuccess(`Position ${result?.ticker || selectedAsset.ticker} ajoutÃ©e sur ${result?.account_name || selectedAccount.account_name}`);
      if (typeof onSuccess === "function") await onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setErrors({ submit: e.message || "Erreur inattendue" });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
    fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary,
    backgroundColor: T.bgCanvas, outline: "none",
  };
  const labelStyle = {
    display: "block", fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
    letterSpacing: "0.10em", textTransform: "uppercase",
    color: T.inkTertiary, marginBottom: 6,
  };
  const errorText = (key) => (errors[key] ? (
    <div style={{ marginTop: 5, fontFamily: FONT_SANS, fontSize: 11.5, color: T.burgundy, fontWeight: 600 }}>{errors[key]}</div>
  ) : null);
  const assetRow = (asset, key, isExternal = false) => (
    <button key={key} onClick={() => selectAsset(isExternal ? { ...asset, isExternal: true } : asset)} style={{
      width: "100%", textAlign: "left", padding: "9px 10px",
      backgroundColor: T.bgSurface, border: "none", borderBottom: `1px solid ${T.borderUltra}`,
      cursor: "pointer",
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: T.inkPrimary }}>{asset.ticker}</span>
      <span style={{ marginLeft: 8, fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary }}>{asset.asset_name}</span>
      <div style={{ marginTop: 2, fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary }}>
        {[asset.exchange_mic, asset.currency, asset.country].filter(Boolean).join(" Â· ")}
      </div>
    </button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(10,10,10,0.32)",
      zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto",
        backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`,
        borderRadius: 12, boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Eyebrow color={T.forestGreen}>Ajouter une position</Eyebrow>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.inkTertiary }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ value: "buy", label: "Buy", icon: TrendingUp }, { value: "sell", label: "Sell", icon: TrendingDown }].map((opt) => {
                const Icon = opt.icon;
                const active = kind === opt.value;
                return (
                  <button key={opt.value} onClick={() => setKind(opt.value)} style={{
                    padding: "10px 8px", border: `1.5px solid ${active ? T.forestGreen : T.borderSubtle}`,
                    backgroundColor: active ? T.bgPour : T.bgCanvas,
                    borderRadius: 8, cursor: "pointer", fontFamily: FONT_SANS,
                    fontSize: 13, fontWeight: 700, color: active ? T.forestGreen : T.inkPrimary,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}><Icon size={14} strokeWidth={2.2} />{opt.label}</button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Compte</label>
            <select value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)} style={fieldStyle}>
              <option value="">Choisir un compte</option>
              {accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.account_name}{a.broker ? ` - ${a.broker}` : ""}</option>)}
            </select>
            {errorText("account")}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Asset</label>
          <AssetSearchInput
            placeholder="Ticker, nom ou theme (ex: Hermes, ASML, tech)"
            onSelect={selectAsset}
            onQueryChange={() => setSelectedAsset(null)}
          />
          {selectedAsset && (
            <div style={{ marginTop: 6, fontFamily: FONT_SANS, fontSize: 12, color: T.forestGreen, fontWeight: 700 }}>
              {selectedAsset.ticker} Â· {selectedAsset.asset_name}
            </div>
          )}
          {errorText("asset")}
          {searchError && <div style={{ marginTop: 5, fontFamily: FONT_SANS, fontSize: 11.5, color: T.burgundy }}>{searchError}</div>}
          {loading && <div style={{ padding: "10px 0", fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>Rechercheâ€¦</div>}
          {!loading && query.length >= 2 && (
            <div style={{ marginTop: 8, maxHeight: 170, overflowY: "auto", border: `1px solid ${T.borderUltra}`, borderRadius: 8 }}>
              {results.internal.map((r) => assetRow(r, r.asset_id))}
              {results.external.map((r) => assetRow(r, `ext:${r.ticker}:${r.exchange_mic}`, true))}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
          <div>
            <label style={labelStyle}>QuantitÃ©</label>
            <input type="number" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" style={fieldStyle} />
            {errorText("quantity")}
          </div>
          <div>
            <label style={labelStyle}>Prix unitaire ({currency})</label>
            <input type="number" step="0.01" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="1500" style={fieldStyle} />
            {errorText("unitPrice")}
          </div>
          <div>
            <label style={labelStyle}>Devise</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={fieldStyle}>
              {SUPPORTED_POSITION_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errorText("currency")}
          </div>
          <div>
            <label style={labelStyle}>Date d'exÃ©cution</label>
            <input type="datetime-local" value={executedAt} onChange={(e) => setExecutedAt(e.target.value)} style={fieldStyle} />
            {errorText("executedAt")}
          </div>
          <div>
            <label style={labelStyle}>Frais</label>
            <input type="number" step="0.01" min="0" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" style={fieldStyle} />
            {errorText("fees")}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexte de l'achat, thÃ¨se..." style={{ ...fieldStyle, resize: "vertical" }} />
        </div>
        {errors.submit && <div style={{ marginTop: 12, fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy, fontWeight: 600 }}>{errors.submit}</div>}
        {success && <div style={{ marginTop: 12, fontFamily: FONT_SANS, fontSize: 12, color: T.forestGreen, fontWeight: 700 }}>{success}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            padding: "10px 16px", border: `1px solid ${T.borderSubtle}`,
            backgroundColor: T.bgSurface, borderRadius: 8, fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Annuler</button>
          <button onClick={handleSubmit} disabled={submitDisabled} style={{
            padding: "10px 18px", backgroundColor: T.inkPrimary, color: T.inkOnDark,
            border: "none", borderRadius: 8, fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 700, cursor: submitDisabled ? "default" : "pointer",
            opacity: submitDisabled ? 0.55 : 1,
          }}>{submitting ? "Ajoutâ€¦" : "Ajouter la position"}</button>
        </div>
      </div>
    </div>
  );
};

const PortefeuillePage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [account, setAccount] = useState("all");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const accountFilter = account === "all" ? null : account;
  const { positions, summary, loading, error, refetch } = usePortfolio({ accountFilter });
  const { refreshing, handleRefresh } = useManualRefresh(refetch);
  const filtered = useMemo(() => (positions || []).map((p) => ({
    ticker: p.ticker,
    name: p.asset_name,
    account: p.account_name,
    qty: Number(p.total_quantity ?? 0),
    avgCost: Number(p.avg_cost_per_unit ?? 0),
    price: Number(p.last_price ?? 0),
    currency: p.asset_currency || "EUR",
    marketValueNative: Number(p.market_value_native ?? 0),
    value: Number(p.market_value_eur ?? 0),
    pnlNative: Number(p.unrealized_pnl_native ?? 0),
    pnlEur: Number(p.unrealized_pnl_eur ?? 0),
    pnlPct: Number(p.unrealized_pnl_pct ?? 0),
    sector: p.asset_class || "",
    series: genSeries(
      Number(p.avg_cost_per_unit || p.last_price || 1),
      Number(p.last_price || p.avg_cost_per_unit || 1),
      60,
      0.01,
      `${p.account_id}:${p.ticker}`
    ),
  })).sort((a, b) => Number(b.marketValueNative || b.value || 0) - Number(a.marketValueNative || a.value || 0)), [positions]);
  const totalValue = Number(summary?.total_value_eur ?? filtered.reduce((s, p) => s + p.value, 0));
  const accounts = summary?.by_account ?? [];
  const totalPositions = Number(summary?.total_positions ?? filtered.length);
  return (
    <main style={{
      maxWidth: CONTAINER_MAX, margin: "0 auto",
      padding: `0 ${CONTAINER_PAD}px`,
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18 }}>
        <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
      </div>
      <PortefeuilleHeader
        totalValue={totalValue}
        totalPositions={totalPositions}
        accounts={accounts}
        account={account}
        setAccount={setAccount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onAddPosition={() => setShowAddPosition(true)}
      />
      <AddPositionModal
        open={showAddPosition}
        onClose={() => setShowAddPosition(false)}
        onSuccess={refetch}
      />
      {!loading && !error && filtered.length > 0 && (
        <PortfolioPerfSummary positions={filtered} />
      )}
      {error && (
        <div style={{ padding: "14px 0", color: T.burgundy, fontFamily: FONT_SANS, fontSize: 13 }}>
          Erreur de chargement du portefeuille.
        </div>
      )}
      {loading && filtered.length === 0 && (
        <div style={{ padding: "32px 0", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
          Chargement des positionsâ€¦
        </div>
      )}
      {viewMode === "list" ? (
        <PortefeuilleTable positions={filtered} onAssetClick={onAssetClick} />
      ) : (
        <section style={{
          paddingTop: 24, paddingBottom: 32,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14,
        }}>
          {filtered.map((p, i) => (
            <PortefeuilleCard key={p.ticker} position={p} index={i}
              onClick={() => onAssetClick(p.ticker)} />
          ))}
        </section>
      )}
    </main>
  );
};

/* ============================================================
   PAGE — WATCHLIST (scanner premium, scores et états)
   ============================================================ */
const WL_ICON_MAP = {
  "shield-check": ShieldCheck,
  "flame": Flame,
  "zap": Zap,
  "repeat": Repeat,
  "eye": Eye,
};

const KIND_META = {
  CONVICTION: { label: "Conviction", desc: "Liste fixe long terme" },
  OPPORTUNITY: { label: "Opportunités", desc: "Dynamique sur signaux" },
  DCA: { label: "DCA", desc: "Accumulation programmée" },
};

const WatchlistSidebarItem = ({ watchlist, isActive, onClick }) => {
  const Icon = watchlist.icon ? WL_ICON_MAP[watchlist.icon] : null;
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left",
      display: "block", padding: "10px 12px",
      borderRadius: 8, border: "none", cursor: "pointer",
      backgroundColor: isActive ? T.bgPour : "transparent",
      transition: "background-color 200ms",
      marginBottom: 2,
    }}
    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = T.bgHover; }}
    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          backgroundColor: watchlist.color || T.forestGreen, flexShrink: 0,
        }} />
        {Icon && <Icon size={13} strokeWidth={2} color={isActive ? T.forestGreen : T.inkSecondary} />}
        <span style={{
          fontFamily: FONT_SANS, fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? T.forestGreen : T.inkPrimary,
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{watchlist.name}</span>
        {watchlist.is_default && (
          <span style={{
            fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.08em", color: T.gold,
            padding: "1px 5px", border: `1px solid ${T.gold}`,
            borderRadius: 3, textTransform: "uppercase",
          }}>défaut</span>
        )}
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
        fontWeight: 500, paddingLeft: 16, letterSpacing: "0.02em",
      }}>
        {KIND_META[watchlist.kind]?.label || watchlist.kind}
        {" · "}{watchlist.items_count} actif{watchlist.items_count > 1 ? "s" : ""}
        {watchlist.account_name && ` · ${watchlist.account_name}`}
      </div>
    </button>
  );
};

const WatchlistSidebar = ({ watchlists, activeId, onSelect, onOpenCreate, loading }) => (
  <aside style={{
    width: 240, flexShrink: 0,
    padding: "0 8px 0 0",
    borderRight: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ padding: "0 12px 12px" }}>
      <Eyebrow color={T.inkTertiary}>Mes watchlists</Eyebrow>
    </div>
    {loading ? (
      <div style={{
        padding: "16px 12px", color: T.inkTertiary,
        fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500,
      }}>Chargement…</div>
    ) : (
      <>
        {watchlists.map((w) => (
          <WatchlistSidebarItem
            key={w.watchlist_id}
            watchlist={w}
            isActive={w.watchlist_id === activeId}
            onClick={() => onSelect(w.watchlist_id)}
          />
        ))}
        <button onClick={onOpenCreate} style={{
          width: "100%", textAlign: "left",
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", marginTop: 8,
          border: `1.5px dashed ${T.forestGreen}`,
          backgroundColor: "transparent",
          borderRadius: 8, cursor: "pointer",
          fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
          color: T.forestGreen,
          transition: "background-color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgPour}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
          <Plus size={14} strokeWidth={2.5} />
          Nouvelle watchlist
        </button>
      </>
    )}
  </aside>
);

const CreateWatchlistPanel = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("CONVICTION");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) { setErr("Le nom est requis"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate({ name: name.trim(), kind });
      setName(""); setKind("CONVICTION");
      onClose();
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{
      padding: "20px 24px", marginBottom: 20,
      backgroundColor: T.bgSurface,
      border: `1.5px solid ${T.forestGreen}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <Eyebrow color={T.forestGreen}>Nouvelle watchlist</Eyebrow>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: T.inkTertiary,
        }}><X size={16} strokeWidth={2} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{
            display: "block", fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.10em", textTransform: "uppercase",
            color: T.inkTertiary, marginBottom: 6,
          }}>Nom</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pépites US, DCA Tech, …"
            style={{
              width: "100%", padding: "10px 12px",
              border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
              fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary,
              backgroundColor: T.bgCanvas, outline: "none",
            }}
            onFocus={(e) => e.target.style.borderColor = T.inkPrimary}
            onBlur={(e) => e.target.style.borderColor = T.borderSubtle}
          />
        </div>
        <div>
          <label style={{
            display: "block", fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.10em", textTransform: "uppercase",
            color: T.inkTertiary, marginBottom: 6,
          }}>Type</label>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(KIND_META).map(([k, m]) => {
              const active = kind === k;
              return (
                <button key={k} onClick={() => setKind(k)} style={{
                  flex: 1, padding: "9px 6px",
                  border: `1.5px solid ${active ? T.forestGreen : T.borderSubtle}`,
                  backgroundColor: active ? T.bgPour : T.bgCanvas,
                  borderRadius: 8, cursor: "pointer",
                  fontFamily: FONT_SANS, fontSize: 11.5,
                  fontWeight: active ? 700 : 600,
                  color: active ? T.forestGreen : T.inkPrimary,
                }}>{m.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {err && (
        <div style={{
          fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy,
          marginBottom: 10, fontWeight: 500,
        }}>{err}</div>
      )}

      <button onClick={submit} disabled={submitting} style={{
        padding: "10px 24px",
        backgroundColor: T.inkPrimary, color: T.inkOnDark,
        border: "none", borderRadius: 8,
        fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
        cursor: submitting ? "default" : "pointer",
        opacity: submitting ? 0.6 : 1,
      }}>
        {submitting ? "Création…" : "Créer la watchlist"}
      </button>
    </div>
  );
};

const DesktopSearchResultRow = ({ ticker, name, meta, isPremium, isTracked, busy, onAdd }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 10px", borderRadius: 6,
    cursor: busy ? "default" : "pointer",
    backgroundColor: busy ? T.bgHover : "transparent",
    transition: "background-color 200ms",
  }}
  onClick={busy ? undefined : onAdd}
  onMouseEnter={(e) => !busy && (e.currentTarget.style.backgroundColor = T.bgHover)}
  onMouseLeave={(e) => !busy && (e.currentTarget.style.backgroundColor = "transparent")}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "0.02em",
        }}>{ticker}</span>
        {isPremium && (
          <span style={{
            fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.08em", color: T.gold,
            padding: "1px 5px", border: `1px solid ${T.gold}`,
            borderRadius: 3, textTransform: "uppercase",
          }}>★</span>
        )}
        {isTracked && (
          <span style={{
            fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.08em", color: T.inkTertiary,
            padding: "1px 5px", border: `1px solid ${T.inkTertiary}`,
            borderRadius: 3, textTransform: "uppercase",
          }}>suivi</span>
        )}
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkSecondary,
        fontWeight: 500, marginTop: 2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{name}</div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary,
        fontWeight: 500, marginTop: 1,
      }}>{meta}</div>
    </div>
    {busy ? (
      <span style={{
        fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600,
      }}>Ajout…</span>
    ) : (
      <Plus size={16} strokeWidth={2.2} color={T.forestGreen} />
    )}
  </div>
);

const AddAssetPanel = ({ open, onClose, onAddAsset, currentWatchlistName }) => {
  const { query, setQuery, results, loading, error, createUserAsset } = useAssetSearch();
  const [busyKey, setBusyKey] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  if (!open) return null;

  const handleAddInternal = async (r) => {
    setBusyKey(r.asset_id); setSubmitErr(null);
    try { await onAddAsset(r.asset_id); setQuery(""); }
    catch (e) { setSubmitErr(e.message || "Erreur"); }
    finally { setBusyKey(null); }
  };

  const handleAddExternal = async (r) => {
    const key = `ext:${r.ticker}:${r.exchange_mic}`;
    setBusyKey(key); setSubmitErr(null);
    try {
      const newAssetId = await createUserAsset(r);
      await onAddAsset(newAssetId);
      setQuery("");
    } catch (e) { setSubmitErr(e.message || "Erreur"); }
    finally { setBusyKey(null); }
  };

  return (
    <div style={{
      padding: "20px 24px", marginBottom: 20,
      backgroundColor: T.bgSurface,
      border: `1.5px solid ${T.forestGreen}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Eyebrow color={T.forestGreen}>Ajouter un actif à {currentWatchlistName}</Eyebrow>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: T.inkTertiary,
        }}><X size={16} strokeWidth={2} /></button>
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} strokeWidth={2} color={T.inkTertiary}
          style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Ticker, nom ou ISIN (ex: NVDA, Carrefour, FR0000120172)"
          autoFocus
          style={{
            width: "100%", padding: "10px 12px 10px 34px",
            border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary,
            backgroundColor: T.bgCanvas, outline: "none",
          }}
          onFocus={(e) => e.target.style.borderColor = T.inkPrimary}
          onBlur={(e) => e.target.style.borderColor = T.borderSubtle}
        />
      </div>

      {submitErr && (
        <div style={{
          fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy,
          marginBottom: 10, fontWeight: 500,
        }}>{submitErr}</div>
      )}

      {loading && (
        <div style={{
          padding: "12px 0", textAlign: "center", color: T.inkTertiary,
          fontFamily: FONT_SANS, fontSize: 12.5,
        }}>Recherche…</div>
      )}

      {!loading && query.length >= 2 && results.internal.length === 0 && results.external.length === 0 && (
        <div style={{
          padding: "16px 0", textAlign: "center", color: T.inkTertiary,
          fontFamily: FONT_SANS, fontSize: 12.5,
        }}>Aucun résultat pour "{query}".</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {results.internal.length > 0 && (
          <div>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase",
              color: T.forestGreen, marginBottom: 6,
            }}>Univers Nexial</div>
            {results.internal.map((r) => (
              <DesktopSearchResultRow
                key={r.asset_id}
                ticker={r.ticker} name={r.asset_name}
                meta={[r.exchange_mic, r.currency, r.coverage_level === "NEXIAL_CORE" ? "★ Couvert" : "Suivi simple"].filter(Boolean).join(" · ")}
                isPremium={r.coverage_level === "NEXIAL_CORE"}
                busy={busyKey === r.asset_id}
                onAdd={() => handleAddInternal(r)}
              />
            ))}
          </div>
        )}
        {results.external.length > 0 && (
          <div>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase",
              color: T.inkTertiary, marginBottom: 6,
            }}>Marchés externes (suivi simple)</div>
            {results.external.map((r) => {
              const key = `ext:${r.ticker}:${r.exchange_mic}`;
              return (
                <DesktopSearchResultRow
                  key={key} ticker={r.ticker} name={r.asset_name}
                  meta={[r.exchange_mic, r.currency, r.country].filter(Boolean).join(" · ")}
                  isTracked
                  busy={busyKey === key}
                  onAdd={() => handleAddExternal(r)}
                />
              );
            })}
          </div>
        )}
      </div>

      {!results.external_search_available && (
        <div style={{
          marginTop: 12, padding: "8px 12px",
          backgroundColor: T.bgAlert, borderRadius: 6,
          fontFamily: FONT_SANS, fontSize: 11, color: T.amber,
          fontWeight: 500, lineHeight: 1.4,
        }}>
          Recherche externe désactivée (TWELVE_DATA_API_KEY manquante).
        </div>
      )}
    </div>
  );
};

const WatchlistMainHeader = ({
  activeWatchlist, itemsCount, isOpportunity,
  viewMode, setViewMode, filter, setFilter,
  filterCounts, onAddAsset, addAssetOpen,
}) => (
  <header style={{
    paddingBottom: 20, borderBottom: `1px solid ${T.borderUltra}`,
    marginBottom: 20,
  }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow color={T.inkTertiary}>{MOCK.date.full}</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <h1 style={{
            margin: 0,
            fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 400,
            color: T.forestGreen, lineHeight: 1.05, letterSpacing: "-0.024em",
          }}>{activeWatchlist?.name || "Watchlist"}</h1>
          <span style={{
            fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 16,
            color: T.inkSecondary, fontWeight: 400,
          }}>
            <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>
              {itemsCount} actif{itemsCount > 1 ? "s" : ""}
            </em>
            {activeWatchlist && (
              <> · {KIND_META[activeWatchlist.kind]?.desc || ""}</>
            )}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {!isOpportunity && activeWatchlist && (
          <button onClick={onAddAsset} style={{
            padding: "8px 14px",
            backgroundColor: addAssetOpen ? T.bgPour : T.bgSurface,
            color: T.forestGreen,
            border: `1.5px solid ${T.forestGreen}`,
            borderRadius: 8, cursor: "pointer",
            fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Plus size={13} strokeWidth={2.5} />
            Ajouter un actif
          </button>
        )}
        <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: T.bgSubtle, borderRadius: 8 }}>
          <button onClick={() => setViewMode("list")} style={{
            padding: "7px 11px", border: "none",
            backgroundColor: viewMode === "list" ? T.bgSurface : "transparent",
            boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            borderRadius: 6, cursor: "pointer",
            color: viewMode === "list" ? T.inkPrimary : T.inkTertiary,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
          }}>
            <List size={13} strokeWidth={2} /> Liste
          </button>
          <button onClick={() => setViewMode("card")} style={{
            padding: "7px 11px", border: "none",
            backgroundColor: viewMode === "card" ? T.bgSurface : "transparent",
            boxShadow: viewMode === "card" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            borderRadius: 6, cursor: "pointer",
            color: viewMode === "card" ? T.inkPrimary : T.inkTertiary,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
          }}>
            <LayoutGrid size={13} strokeWidth={2} /> Cartes
          </button>
        </div>
      </div>
    </div>

    {isOpportunity && (
      <div style={{
        padding: "10px 14px", marginBottom: 14,
        backgroundColor: T.bgAlert, borderRadius: 8,
        fontFamily: FONT_SANS, fontSize: 12, color: T.amber,
        fontWeight: 500, lineHeight: 1.45,
        border: `1px solid rgba(139,94,10,0.2)`,
      }}>
        Watchlist dynamique : les actifs apparaissent automatiquement quand un signal Nexial (BUY_ZONE, HOT_PULLBACK, WATCH_PULLBACK) se déclenche.
      </div>
    )}

    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
      {[
        { id: "all", label: "Tous", count: filterCounts.all },
        { id: "opportunities", label: "Opportunités", count: filterCounts.opp },
        { id: "held", label: "Détenus", count: filterCounts.held },
        { id: "watch", label: "Surveillance", count: filterCounts.watch },
      ].map((f) => {
        const active = filter === f.id;
        return (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "7px 13px",
            backgroundColor: active ? T.forestGreen : "transparent",
            color: active ? T.inkOnDark : T.inkSecondary,
            border: `1px solid ${active ? T.forestGreen : T.borderHair}`,
            borderRadius: 20, cursor: "pointer",
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {f.label}
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
              color: active ? T.forestGreenPale : T.inkQuaternary,
            }}>{f.count}</span>
          </button>
        );
      })}
    </div>
  </header>
);

const stateMetaLive = (signal) => {
  if (signal === "BUY_ZONE") return { label: "Opportunité", color: T.forestGreen, bg: T.bgPour };
  if (signal === "HOT_PULLBACK") return { label: "Opportunité", color: T.forestGreen, bg: T.bgPour };
  if (signal === "WATCH_PULLBACK") return { label: "À surveiller", color: T.gold, bg: "rgba(125,102,40,0.08)" };
  if (signal === "WATCH_BORDERLINE") return { label: "À surveiller", color: T.gold, bg: "rgba(125,102,40,0.08)" };
  if (signal === "TOO_EXPENSIVE") return { label: "Tendu", color: T.amber, bg: T.bgAlert };
  if (signal === "FLASH_DROP") return { label: "Flash drop", color: T.burgundy, bg: T.bgContre };
  if (signal === "OVERBOUGHT") return { label: "Surachat", color: T.amber, bg: T.bgAlert };
  if (signal === "UNKNOWN" || !signal) return { label: "—", color: T.inkTertiary, bg: T.bgSubtle };
  return { label: signal, color: T.inkTertiary, bg: T.bgSubtle };
};

const WatchlistLiveTable = ({ items, onAssetClick, onRemoveRequest, isOpportunity }) => (
  <section>
    <div style={{
      display: "grid",
      gridTemplateColumns: "60px 1.5fr 130px 80px 90px 90px 70px 30px",
      gap: 12, alignItems: "center",
      padding: "12px 16px",
      borderBottom: `1px solid ${T.borderHair}`,
    }}>
      {["Ticker", "Nom", "État", "Score", "Prix", "1d %", "", ""].map((h, i) => (
        <span key={i} style={{
          fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase",
          color: T.inkTertiary,
          textAlign: ["Score", "Prix", "1d %"].includes(h) ? "right" : "left",
        }}>{h}</span>
      ))}
    </div>
    {items.map((it) => {
      const sm = stateMetaLive(it.signal);
      const score = Number(it.opportunity_score ?? 0);
      const delta = Number(it.perf_1d_pct ?? 0);
      const isPos = delta >= 0;
      const price = Number(it.current_price ?? 0);
      const currency = it.currency || "USD";
      const priceFmt = currency === "EUR" ? `${price.toFixed(2)} €` : `$${price.toFixed(2)}`;
      return (
        <div key={(it.item_id || it.dynamic_key || it.asset_id)} style={{
          display: "grid",
          gridTemplateColumns: "60px 1.5fr 130px 80px 90px 90px 70px 30px",
          gap: 12, alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${T.borderUltra}`,
          transition: "background-color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
          <span onClick={() => onAssetClick(it.ticker)} style={{
            fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.02em", cursor: "pointer",
          }}>{it.ticker}</span>
          <div onClick={() => onAssetClick(it.ticker)} style={{ cursor: "pointer", minWidth: 0 }}>
            <div style={{
              fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {it.asset_name || it.ticker}
              {it.in_portfolio && <Badge variant="soft">DÉTENU</Badge>}
            </div>
          </div>
          <span style={{
            display: "inline-flex", padding: "3px 8px", borderRadius: 4,
            backgroundColor: sm.bg, color: sm.color,
            fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.10em", textTransform: "uppercase",
            border: `1px solid ${sm.color}40`,
            justifySelf: "start",
          }}>{sm.label}</span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 500,
            color: score >= 70 ? T.forestGreen : score >= 50 ? T.gold : score > 0 ? T.burgundy : T.inkTertiary,
            letterSpacing: "-0.01em", textAlign: "right",
          }}>{score > 0 ? score.toFixed(0) : "—"}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary,
            fontWeight: 700, textAlign: "right",
          }}>{price > 0 ? priceFmt : "—"}</span>
          <div style={{ textAlign: "right" }}>
            {price > 0 && (
              <MetricChip variant={isPos ? "positive" : "negative"}>{fmtPct(delta)}</MetricChip>
            )}
          </div>
          <ChevronRight size={14} color={T.inkQuaternary} strokeWidth={1.5}
            onClick={() => onAssetClick(it.ticker)} style={{ cursor: "pointer" }} />
          {!isOpportunity ? (
            <button
              onClick={() => onRemoveRequest(it)}
              aria-label="Plus d'actions"
              style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: 4, color: T.inkQuaternary,
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.burgundy}
            onMouseLeave={(e) => e.currentTarget.style.color = T.inkQuaternary}
            title="Plus d'actions">
              <MoreHorizontal size={15} strokeWidth={2.2} />
            </button>
          ) : <span />}
        </div>
      );
    })}
  </section>
);

const WatchlistLiveCard = ({ item, onClick, onRemoveRequest, isOpportunity }) => {
  const sm = stateMetaLive(item.signal);
  const score = Number(item.opportunity_score ?? 0);
  const delta = Number(item.perf_1d_pct ?? 0);
  const isPos = delta >= 0;
  const price = Number(item.current_price ?? 0);
  const currency = item.currency || "USD";
  const priceFmt = currency === "EUR" ? `${price.toFixed(2)} €` : `$${price.toFixed(2)}`;
  const scoreColor = score >= 70 ? T.forestGreen : score >= 50 ? T.gold : score > 0 ? T.burgundy : T.inkTertiary;
  return (
    <div style={{
      position: "relative",
      padding: "14px 16px 14px 18px",
      backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderUltra}`,
      borderRadius: 12, cursor: "pointer", overflow: "hidden",
      transition: "transform 200ms",
    }}
    onClick={onClick}
    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        backgroundColor: sm.color,
      }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 4,
      }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "0.02em",
        }}>{item.ticker}</span>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500,
          color: scoreColor, letterSpacing: "-0.01em",
        }}>{score > 0 ? score.toFixed(0) : "—"}</span>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkSecondary,
        fontWeight: 500, marginBottom: 8,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{item.asset_name || item.ticker}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{
          padding: "2px 7px", borderRadius: 4,
          backgroundColor: sm.bg, color: sm.color,
          fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>{sm.label}</span>
        {item.in_portfolio && (
          <span style={{
            padding: "2px 7px", borderRadius: 4,
            backgroundColor: "rgba(31,74,46,0.10)", color: T.forestGreen,
            fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.10em", textTransform: "uppercase",
          }}>Détenu</span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 13, color: T.inkPrimary, fontWeight: 700,
        }}>{price > 0 ? priceFmt : "—"}</span>
        {price > 0 && (
          <MetricChip variant={isPos ? "positive" : "negative"}>{fmtPct(delta)}</MetricChip>
        )}
      </div>
      {!isOpportunity && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveRequest(item); }}
          aria-label="Plus d'actions"
          style={{
          position: "absolute", top: 8, right: 8,
          background: "transparent", border: "none", cursor: "pointer",
          padding: 4, color: T.inkQuaternary,
          opacity: 0.6,
          transition: "color 200ms, opacity 200ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = T.burgundy; e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = T.inkQuaternary; e.currentTarget.style.opacity = "0.6"; }}
        title="Plus d'actions">
          <MoreHorizontal size={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
};

const RemoveAssetConfirmModal = ({ item, onClose, onConfirm }) => {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);

  if (!item) return null;

  const handleConfirm = async () => {
    setRemoving(true);
    setError(null);
    try {
      await onConfirm(item.asset_id);
      onClose();
    } catch (e) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      backgroundColor: "rgba(10,10,10,0.32)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "min(420px, 100%)",
        backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderUltra}`,
        borderRadius: 12,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Eyebrow color={T.burgundy}>Retirer de la watchlist</Eyebrow>
          <button onClick={onClose} disabled={removing} style={{
            background: "none", border: "none", cursor: removing ? "default" : "pointer",
            padding: 4, color: T.inkTertiary,
          }}><X size={18} strokeWidth={2} /></button>
        </div>
        <h3 style={{
          margin: "0 0 8px", fontFamily: FONT_DISPLAY,
          fontSize: 26, fontWeight: 400, color: T.inkPrimary,
          letterSpacing: "-0.020em",
        }}>Retirer {item.ticker} ?</h3>
        <p style={{
          margin: 0, fontFamily: FONT_SANS, fontSize: 13,
          lineHeight: 1.55, color: T.inkSecondary,
        }}>
          {item.asset_name || item.name || item.ticker} sera retirÃ© de la watchlist. Tu pourras toujours le rÃ©ajouter plus tard.
        </p>
        {error && (
          <div style={{
            marginTop: 14, padding: "10px 12px",
            backgroundColor: T.bgContre, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy,
            fontWeight: 600,
          }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} disabled={removing} style={{
            padding: "10px 16px", border: `1px solid ${T.borderSubtle}`,
            backgroundColor: T.bgSurface, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
            color: T.inkSecondary, cursor: removing ? "default" : "pointer",
          }}>Annuler</button>
          <button onClick={handleConfirm} disabled={removing} style={{
            padding: "10px 18px", border: "none",
            backgroundColor: T.burgundy, color: T.inkOnDark,
            borderRadius: 8, fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 700,
            cursor: removing ? "default" : "pointer",
            opacity: removing ? 0.65 : 1,
          }}>{removing ? "Suppression..." : "Retirer"}</button>
        </div>
      </div>
    </div>
  );
};

const WatchlistPage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  const { watchlists, loading: wlLoading, refetch: refetchWatchlists, create: createWatchlist } = useWatchlists();

  useEffect(() => {
    if (!activeId && watchlists.length > 0) {
      const def = watchlists.find((w) => w.is_default) || watchlists[0];
      setActiveId(def.watchlist_id);
    }
  }, [watchlists, activeId]);

  useEffect(() => {
    setFilter("all");
    setShowAddAsset(false);
  }, [activeId]);

  const activeWatchlist = watchlists.find((w) => w.watchlist_id === activeId);
  const isOpportunity = activeWatchlist?.kind === "OPPORTUNITY";
  const { items, loading: itemsLoading, error, refetch: refetchItems, addItem, removeItem } = useWatchlistItems(activeId);
  const { refreshing, handleRefresh } = useManualRefresh(async () => {
    await Promise.all([refetchWatchlists(), refetchItems()]);
  });

  const filterCounts = useMemo(() => {
    const all = items.length;
    const opp = items.filter((it) => it.signal === "BUY_ZONE" || it.signal === "HOT_PULLBACK").length;
    const held = items.filter((it) => it.in_portfolio === true).length;
    const watch = items.filter((it) => it.signal === "WATCH_PULLBACK" || it.signal === "WATCH_BORDERLINE").length;
    return { all, opp, held, watch };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "opportunities") return items.filter((it) => it.signal === "BUY_ZONE" || it.signal === "HOT_PULLBACK");
    if (filter === "held") return items.filter((it) => it.in_portfolio === true);
    if (filter === "watch") return items.filter((it) => it.signal === "WATCH_PULLBACK" || it.signal === "WATCH_BORDERLINE");
    return items;
  }, [items, filter]);

  const handleCreate = async (input) => {
    const newId = await createWatchlist(input);
    setActiveId(newId);
  };

  const handleAddAsset = async (assetId) => {
    await addItem(assetId);
    setShowAddAsset(false);
  };

  return (
    <main style={{
      maxWidth: CONTAINER_MAX, margin: "0 auto",
      padding: `28px ${CONTAINER_PAD}px`,
    }}>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <WatchlistSidebar
          watchlists={watchlists}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setShowCreate(false); }}
          onOpenCreate={() => { setShowCreate(true); setShowAddAsset(false); }}
          loading={wlLoading}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
          </div>
          <WatchlistMainHeader
            activeWatchlist={activeWatchlist}
            itemsCount={items.length}
            isOpportunity={isOpportunity}
            viewMode={viewMode} setViewMode={setViewMode}
            filter={filter} setFilter={setFilter}
            filterCounts={filterCounts}
            onAddAsset={() => { setShowAddAsset((s) => !s); setShowCreate(false); }}
            addAssetOpen={showAddAsset}
          />

          <CreateWatchlistPanel
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />

          <AddAssetPanel
            open={showAddAsset}
            onClose={() => setShowAddAsset(false)}
            onAddAsset={handleAddAsset}
            currentWatchlistName={activeWatchlist?.name || ""}
          />

          {error && (
            <div style={{
              padding: "12px 16px", color: T.burgundy,
              fontFamily: FONT_SANS, fontSize: 13, marginBottom: 16,
              backgroundColor: T.bgContre, borderRadius: 8,
            }}>
              Erreur de chargement — réessai automatique dans 60s.
            </div>
          )}

          {itemsLoading && items.length === 0 ? (
            <div style={{
              padding: "48px 0", textAlign: "center",
              fontFamily: FONT_SANS, fontSize: 13, color: T.inkTertiary,
            }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: "60px 24px", textAlign: "center",
              fontFamily: FONT_DISPLAY, fontSize: 18, fontStyle: "italic",
              color: T.inkSecondary,
            }}>
              {isOpportunity
                ? "Aucune opportunité détectée actuellement. La liste se met à jour automatiquement."
                : items.length === 0
                  ? "Cette watchlist est vide. Ajoute un actif via le bouton ci-dessus."
                  : "Aucun actif ne correspond à ce filtre."}
            </div>
          ) : viewMode === "list" ? (
            <WatchlistLiveTable
              items={filtered}
              onAssetClick={onAssetClick}
              onRemoveRequest={setItemToRemove}
              isOpportunity={isOpportunity}
            />
          ) : (
            <section style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
            }}>
              {filtered.map((it) => (
                <WatchlistLiveCard
                  key={it.item_id || it.dynamic_key || it.asset_id}
                  item={it}
                  onClick={() => onAssetClick(it.ticker)}
                  onRemoveRequest={setItemToRemove}
                  isOpportunity={isOpportunity}
                />
              ))}
            </section>
          )}
        </div>
      </div>
      {itemToRemove && (
        <RemoveAssetConfirmModal
          item={itemToRemove}
          onClose={() => setItemToRemove(null)}
          onConfirm={removeItem}
        />
      )}
    </main>
  );
};

/* ============================================================
   PAGE — DÉTAIL ASSET (fiche d'analyse magazine 2 colonnes)
   ============================================================ */
const detailMoney = (value, currency = "EUR", digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits })} ${currency || "EUR"}`;
};

const DetailMetric = ({ label, value, sub, color = T.inkPrimary }) => (
  <div style={{
    padding: "12px 14px", backgroundColor: T.bgSurface,
    border: `1px solid ${T.borderUltra}`, borderRadius: 8,
  }}>
    <div style={{
      fontFamily: FONT_SANS, fontSize: 9.5, color: T.inkTertiary,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
    }}>{label}</div>
    <div style={{
      marginTop: 5, fontFamily: FONT_MONO, fontSize: 14,
      color, fontWeight: 700,
    }}>{value}</div>
    {sub && (
      <div style={{ marginTop: 3, fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary }}>
        {sub}
      </div>
    )}
  </div>
);

const rsiInterpretation = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Non disponible";
  if (n < 30) return "Survente";
  if (n > 70) return "Surachat";
  return "Neutre";
};

const EnrichedDetailPanel = ({ a }) => {
  const currency = a.currency || "EUR";
  const rsi = a.indicators?.find((i) => i.label === "RSI 14")?.value;
  const zones = (a.paliers || []).slice(0, 3).map((p, i) => ({ label: `Z${i + 1}`, price: p.price }));
  const activeAlerts = [
    a.state ? { id: "state", label: a.state, status: "ACTIVE" } : null,
    ...(a.paliers || []).map((p) => ({ id: p.rank, label: `${p.rank} ${a.currency}${p.price}`, status: "ORDER_ZONE" })),
  ].filter(Boolean);

  return (
    <section style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <Eyebrow style={{ display: "block", marginBottom: 10 }}>Techniques</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <DetailMetric label="RSI 14" value={rsi || "-"} sub={rsiInterpretation(Number(rsi))} />
          <DetailMetric label="Drawdown" value={`${Number(a.delta || 0).toFixed(1)}%`} color={T.burgundy} />
          <DetailMetric label="vs EMA200" value="-" sub="Non disponible" />
          <DetailMetric label="Volume vs 20j" value="-" sub="Non disponible" />
        </div>
      </div>
      <div style={{ padding: 16, backgroundColor: T.bgPour, border: `1px solid ${T.borderUltra}`, borderRadius: 12 }}>
        <Eyebrow color={T.forestGreen}>Zones de buy</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          {zones.map((z) => <DetailMetric key={z.label} label={z.label} value={detailMoney(z.price, currency)} sub="Palier surveille" />)}
        </div>
      </div>
      {a.isHeld && (
        <div style={{ padding: 16, backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`, borderRadius: 12 }}>
          <Eyebrow>Ma position</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            <DetailMetric label="Quantite" value="-" />
            <DetailMetric label="PRU" value="-" />
            <DetailMetric label="Valeur" value="-" />
            <DetailMetric label="P&L" value="-" />
          </div>
        </div>
      )}
      <div style={{ padding: 16, backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`, borderRadius: 12 }}>
        <Eyebrow>Alertes actives</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {activeAlerts.length === 0 ? (
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>Aucune alerte active</span>
          ) : activeAlerts.map((alert) => (
            <div key={alert.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
            }}>
              <span>{alert.label}</span>
              <Badge variant="soft">{alert.status}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 16, backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`, borderRadius: 12 }}>
        <Eyebrow>Historique transactions</Eyebrow>
        <div style={{ marginTop: 10, fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>
          Historique detaille non disponible dans l'API actuelle.
        </div>
      </div>
    </section>
  );
};

const DESKTOP_NOTE_KIND_META = {
  thesis: { label: "These", color: T.forestGreen },
  observation: { label: "Observation", color: T.inkSecondary },
  todo: { label: "A faire", color: T.amber },
  event: { label: "Evenement", color: T.burgundy },
};

const desktopFormatNoteDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const DesktopNoteEditor = ({ initialText = "", initialKind = "observation", onSave, onCancel }) => {
  const [text, setText] = useState(initialText);
  const [kind, setKind] = useState(initialKind);

  return (
    <div style={{ padding: 14, backgroundColor: T.bgCanvas, border: `1px solid ${T.borderUltra}`, borderRadius: 10 }}>
      <select value={kind} onChange={(e) => setKind(e.target.value)} style={{
        width: "100%", padding: "9px 10px", border: `1px solid ${T.borderSubtle}`,
        borderRadius: 8, backgroundColor: T.bgSurface, color: T.inkPrimary,
        fontFamily: FONT_SANS, fontSize: 12,
      }}>
        <option value="thesis">These</option>
        <option value="observation">Observation</option>
        <option value="todo">A faire</option>
        <option value="event">Evenement</option>
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Note libre..."
        style={{
          width: "100%", marginTop: 8, padding: 10, resize: "vertical",
          border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
          backgroundColor: T.bgSurface, color: T.inkPrimary,
          fontFamily: FONT_SANS, fontSize: 12.5, lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onCancel} style={{
          padding: "8px 11px", border: `1px solid ${T.borderSubtle}`,
          backgroundColor: "transparent", borderRadius: 7,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
          color: T.inkSecondary, cursor: "pointer",
        }}>Annuler</button>
        <button type="button" disabled={!text.trim()} onClick={() => onSave(text.trim(), kind)} style={{
          padding: "8px 11px", border: "none",
          backgroundColor: T.inkPrimary, color: T.inkOnDark,
          borderRadius: 7, fontFamily: FONT_SANS, fontSize: 12,
          fontWeight: 700, cursor: text.trim() ? "pointer" : "default",
          opacity: text.trim() ? 1 : 0.5,
        }}>Enregistrer</button>
      </div>
    </div>
  );
};

const DesktopNoteCard = ({ note, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const kindInfo = DESKTOP_NOTE_KIND_META[note.kind] || DESKTOP_NOTE_KIND_META.observation;
  const text = note.text ?? note.note_text ?? "";

  if (editing) {
    return (
      <DesktopNoteEditor
        initialText={text}
        initialKind={note.kind}
        onCancel={() => setEditing(false)}
        onSave={async (nextText, nextKind) => {
          await onUpdate(note.id, nextText, nextKind);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div style={{ padding: 14, backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span style={{
          fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase", color: kindInfo.color,
        }}>{kindInfo.label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.inkTertiary, fontWeight: 700 }}>
          {desktopFormatNoteDate(note.created_at)}
        </span>
      </div>
      <p style={{ margin: 0, fontFamily: FONT_SANS, fontSize: 12.5, lineHeight: 1.55, color: T.inkPrimary }}>
        {text}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => setEditing(true)} style={{
          border: `1px solid ${T.borderSubtle}`, backgroundColor: "transparent",
          borderRadius: 6, padding: 6, color: T.inkSecondary, cursor: "pointer",
        }}><Edit3 size={13} /></button>
        <button type="button" onClick={() => onDelete(note.id)} style={{
          border: "none", backgroundColor: "transparent",
          borderRadius: 6, padding: 6, color: T.burgundy, cursor: "pointer",
        }}><Trash2 size={13} /></button>
      </div>
    </div>
  );
};

const DesktopAssetNotesPanel = ({ assetId }) => {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const loadNotes = React.useCallback(async () => {
    if (!assetId) return;
    const { data, error: rpcError } = await supabase.rpc("fn_list_asset_notes", { p_asset_id: assetId });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNotes([...(data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setError(null);
  }, [assetId, supabase]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSave = async (text, kind) => {
    if (!assetId) {
      setNotes((items) => [{ id: `local-${Date.now()}`, text, kind, created_at: new Date().toISOString() }, ...items]);
      setAdding(false);
      return;
    }
    const { error: rpcError } = await supabase.rpc("fn_add_asset_note", {
      p_asset_id: assetId,
      p_note_text: text,
      p_note_kind: kind,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setAdding(false);
    await loadNotes();
  };

  const handleUpdate = async (noteId, text, kind) => {
    if (String(noteId).startsWith("local-")) {
      setNotes((items) => items.map((n) => n.id === noteId ? { ...n, text, kind, updated_at: new Date().toISOString() } : n));
      return;
    }
    const { error: rpcError } = await supabase.rpc("fn_update_asset_note", {
      p_note_id: noteId,
      p_note_text: text,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await loadNotes();
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    if (String(noteId).startsWith("local-")) {
      setNotes((items) => items.filter((n) => n.id !== noteId));
      return;
    }
    const { error: rpcError } = await supabase.rpc("fn_delete_asset_note", { p_note_id: noteId });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await loadNotes();
  };

  return (
    <section style={{ marginTop: 18, padding: 18, backgroundColor: T.bgSurface, border: `1px solid ${T.borderUltra}`, borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Eyebrow>Mes notes ({notes.length})</Eyebrow>
        <button type="button" onClick={() => setAdding((v) => !v)} style={{
          border: `1px solid ${T.borderSubtle}`, backgroundColor: T.bgSurface,
          borderRadius: 7, padding: "7px 10px", color: T.forestGreen,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 800,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        }}><Plus size={13} />Ajouter</button>
      </div>
      {!assetId && (
        <div style={{ marginTop: 8, fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary }}>
          Notes temporaires: asset_id non expose par l'API actuelle.
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy, fontWeight: 700 }}>{error}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {adding && <DesktopNoteEditor onCancel={() => setAdding(false)} onSave={handleSave} />}
        {notes.map((note) => (
          <DesktopNoteCard key={note.id} note={note} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
        {!adding && notes.length === 0 && (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>Aucune note pour cet asset.</span>
        )}
      </div>
    </section>
  );
};

const AssetDetailPage = ({ ticker, onBack }) => {
  const a = MOCK.assetDetail;
  const accent = a.score >= 8 ? T.forestGreen : a.score >= 6 ? T.gold : T.burgundy;
  return (
    <main style={{
      maxWidth: CONTAINER_MAX, margin: "0 auto",
      padding: `0 ${CONTAINER_PAD}px`,
    }}>
      {/* Header retour + titre */}
      <header style={{
        paddingTop: 28, paddingBottom: 28,
        borderBottom: `1px solid ${T.borderUltra}`,
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          color: T.forestGreen, fontFamily: FONT_SANS, fontSize: 12.5,
          fontWeight: 600, padding: 0, marginBottom: 18,
        }}>
          <ArrowLeft size={14} strokeWidth={2.2} /> Retour
        </button>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 16,
          flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.02em",
          }}>{a.ticker}</span>
          <h1 style={{
            margin: 0,
            fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.024em", lineHeight: 1.05,
          }}>{a.name}</h1>
          <Badge variant="success">★ {a.quality.replace(/_/g, " ")}</Badge>
          <Badge variant="warning">{stateMeta(a.state).label}</Badge>
        </div>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary,
          fontWeight: 500, marginTop: 8, letterSpacing: "0.02em",
        }}>{a.sector}</div>
      </header>

      {/* 2 cols magazine */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.6fr 1fr",
        gap: 36, paddingTop: 32, paddingBottom: 32,
      }}>
        {/* Col gauche · score + thèse + pour/contre + indicateurs */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 24,
            padding: "20px 24px",
            backgroundColor: T.bgPour,
            border: `1px solid rgba(31,74,46,0.15)`,
            borderRadius: 14,
            marginBottom: 24,
          }}>
            <ScoreGauge value={a.score} max={10} size={88} />
            <div style={{ flex: 1 }}>
              <Eyebrow color={T.forestGreen}>Score combiné</Eyebrow>
              <div style={{
                marginTop: 12,
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
              }}>
                {a.scoreSubs.map((s) => {
                  const c = s.value >= 8 ? T.forestGreen : s.value >= 6 ? T.gold : T.burgundy;
                  return (
                    <div key={s.label}>
                      <div style={{
                        fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
                        color: T.inkTertiary, letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>{s.label}</div>
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
                        color: c, letterSpacing: "-0.018em", marginTop: 2, lineHeight: 1,
                      }}>{s.value.toFixed(1)}</div>
                      <div style={{
                        marginTop: 6, height: 3, backgroundColor: T.borderUltra,
                        borderRadius: 2, overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${(s.value / 10) * 100}%`, height: "100%",
                          backgroundColor: c, borderRadius: 2,
                          transition: "width 600ms ease-out",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p style={{
            margin: "0 0 24px 0",
            fontFamily: FONT_DISPLAY, fontStyle: "italic",
            fontSize: 22, lineHeight: 1.5,
            color: T.inkPrimary, letterSpacing: "-0.005em",
          }}>« {a.thesis} »</p>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24,
          }}>
            <div style={{
              padding: "16px 18px", backgroundColor: T.bgPour,
              border: `1px solid rgba(31,74,46,0.15)`, borderRadius: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <CheckCircle2 size={13} color={T.forestGreen} strokeWidth={2.2} />
                <Eyebrow color={T.forestGreen}>Pour</Eyebrow>
              </div>
              {a.pour.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  fontFamily: FONT_SANS, fontSize: 12, color: T.inkPrimary,
                  lineHeight: 1.5, fontWeight: 500, marginBottom: 6,
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    backgroundColor: T.forestGreen, marginTop: 7, flexShrink: 0,
                  }} />
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: "16px 18px", backgroundColor: T.bgContre,
              border: `1px solid rgba(95,34,34,0.15)`, borderRadius: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <XCircle size={13} color={T.burgundy} strokeWidth={2.2} />
                <Eyebrow color={T.burgundy}>Contre</Eyebrow>
              </div>
              {a.contre.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  fontFamily: FONT_SANS, fontSize: 12, color: T.inkPrimary,
                  lineHeight: 1.5, fontWeight: 500, marginBottom: 6,
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    backgroundColor: T.burgundy, marginTop: 7, flexShrink: 0,
                  }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          <Eyebrow style={{ display: "block", marginBottom: 12 }}>Indicateurs techniques</Eyebrow>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
          }}>
            {a.indicators.map((ind, i) => {
              const c = ind.state === "positive" ? T.forestGreen :
                       ind.state === "warning" ? T.amber : T.inkSecondary;
              const bg = ind.state === "positive" ? T.bgPour :
                        ind.state === "warning" ? T.bgAlert : T.bgSubtle;
              return (
                <div key={i} style={{
                  padding: "10px 12px", backgroundColor: bg,
                  border: `1px solid ${T.borderUltra}`, borderRadius: 8,
                }}>
                  <div style={{
                    fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
                    color: T.inkTertiary, letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}>{ind.label}</div>
                  <div style={{
                    marginTop: 4, fontFamily: FONT_MONO, fontSize: 14,
                    color: c, fontWeight: 700,
                  }}>{ind.value}</div>
                </div>
              );
            })}
          </div>
          <EnrichedDetailPanel a={a} />
          <DesktopAssetNotesPanel assetId={a.asset_id} />
        </div>

        {/* Col droite · prix + chart + paliers + CTAs + alertes passées */}
        <div>
          <div style={{
            padding: "18px 20px",
            backgroundColor: T.bgSurface,
            border: `1px solid ${T.borderUltra}`, borderRadius: 12,
            marginBottom: 14,
          }}>
            <Eyebrow color={T.inkTertiary}>Prix actuel</Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
                color: T.inkPrimary, letterSpacing: "-0.024em", lineHeight: 1,
              }}>{a.currency}{a.price.toFixed(2)}</div>
              <MetricChip variant="negative">{fmtPct(a.delta)}</MetricChip>
            </div>
            <div style={{ marginTop: 16, height: 100 }}>
              <Sparkline data={a.series} height={100}
                color={accent} fillGradient strokeWidth={1.5} id="detail-spark" />
            </div>
          </div>

          <div style={{
            padding: "18px 20px",
            backgroundColor: T.bgPour,
            border: `1px solid rgba(31,74,46,0.15)`, borderRadius: 12,
            marginBottom: 14,
          }}>
            <Eyebrow color={T.forestGreen}>Plan d'ordres · 3 paliers</Eyebrow>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {a.paliers.map((p) => {
                const palierColor = p.rank === "P1" ? T.forestGreen :
                                   p.rank === "P2" ? T.gold : T.burgundy;
                return (
                  <div key={p.rank} style={{
                    position: "relative",
                    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
                    padding: "10px 14px 10px 16px",
                    backgroundColor: T.bgSurface,
                    borderRadius: 8, overflow: "hidden",
                    border: `1px solid ${T.borderUltra}`,
                    alignItems: "center",
                  }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                      backgroundColor: palierColor,
                    }} />
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
                      color: palierColor, letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}>{p.rank}</span>
                    <span style={{
                      fontFamily: FONT_MONO, fontSize: 13, color: T.inkPrimary, fontWeight: 700,
                    }}>{a.currency}{p.price}</span>
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 11, color: T.inkSecondary, fontWeight: 600,
                    }}>{p.qty} pcs · {p.weight}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            <button style={{
              padding: "14px 20px",
              backgroundColor: T.inkPrimary, color: T.inkOnDark,
              border: "none", borderRadius: 10,
              fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600,
              letterSpacing: "-0.005em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Valider les 3 ordres
              <ArrowUpRight size={14} strokeWidth={2.2} />
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={{
                padding: "12px 16px", background: "transparent", color: T.inkPrimary,
                border: `1.5px solid ${T.inkPrimary}`, borderRadius: 8,
                fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>Détails ↗</button>
              <button style={{
                padding: "12px 16px", background: "transparent", color: T.inkPrimary,
                border: `1.5px solid ${T.inkPrimary}`, borderRadius: 8,
                fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>Reporter</button>
            </div>
          </div>

          <Eyebrow style={{ display: "block", marginBottom: 10 }}>Historique alertes</Eyebrow>
          {a.pastAlerts.map((al, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 12,
              alignItems: "center", padding: "10px 0",
              borderTop: i === 0 ? `1px solid ${T.borderUltra}` : "none",
              borderBottom: `1px solid ${T.borderUltra}`,
            }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary, fontWeight: 700,
              }}>{al.date}</span>
              <span style={{
                fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkSecondary, fontWeight: 500,
              }}>{al.kind.replace(/_/g, " ").toLowerCase()}</span>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, color: T.forestGreen, fontWeight: 700,
              }}>{al.outcome}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

/* ============================================================
   PAGE — DEV/ADMIN (monitoring opérationnel, accès caché via footer)
   ============================================================ */
const DevHeader = () => (
  <header style={{
    paddingTop: 36, paddingBottom: 24,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <Eyebrow color={T.burgundy}>{MOCK.date.full} · zone admin</Eyebrow>
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
      <h1 style={{
        margin: 0,
        fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 400,
        color: T.inkPrimary, lineHeight: 1.05,
        letterSpacing: "-0.024em",
      }}>Dev / Admin</h1>
      <span style={{
        fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18,
        color: T.inkSecondary, fontWeight: 400, letterSpacing: "-0.005em",
      }}>
        monitoring opérationnel ·{" "}
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>tous systèmes OK</em>
      </span>
    </div>
  </header>
);

const DevPipelineKPIs = () => {
  const p = MOCK.dev.pipeline;
  return (
    <section style={{
      paddingTop: 28, paddingBottom: 28,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{
        position: "relative",
        backgroundColor: T.bgPour,
        border: `1px solid rgba(31,74,46,0.15)`,
        borderRadius: 14,
        padding: "20px 24px 20px 28px",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
          backgroundColor: T.forestGreen, borderRadius: "14px 0 0 14px",
        }} />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24, alignItems: "baseline",
        }}>
          <div>
            <Eyebrow color={T.forestGreen}>Engine</Eyebrow>
            <div style={{
              marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400,
              color: T.inkPrimary, letterSpacing: "-0.022em", lineHeight: 1,
            }}>{p.engine}</div>
          </div>
          <div>
            <Eyebrow color={T.forestGreen}>Régime</Eyebrow>
            <div style={{
              marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.amber, letterSpacing: "-0.020em", lineHeight: 1,
            }}>{p.regime.split(' × ')[0]}</div>
            <div style={{
              marginTop: 4, fontFamily: FONT_MONO, fontSize: 11,
              color: T.inkSecondary, fontWeight: 700,
            }}>× {p.regime.split(' × ')[1]}</div>
          </div>
          <div>
            <Eyebrow color={T.forestGreen}>Dernier daily</Eyebrow>
            <div style={{
              marginTop: 8, fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700,
              color: T.inkPrimary, lineHeight: 1.3,
            }}>{p.lastDailyRun}</div>
          </div>
          <div>
            <Eyebrow color={T.forestGreen}>Statut global</Eyebrow>
            <div style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 8,
              fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.forestGreen, letterSpacing: "-0.020em", lineHeight: 1,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                backgroundColor: T.forestGreen, flexShrink: 0,
              }} />
              {p.status}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const DevCronsTable = () => {
  const crons = MOCK.dev.crons;
  return (
    <section style={{
      paddingTop: 32, paddingBottom: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>I · Crons & Pipelines</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>14 jobs cron</em>
          {" "}actifs · tous OK.
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr 1fr 80px 80px",
        gap: 12, alignItems: "center",
        padding: "10px 16px",
        borderBottom: `1px solid ${T.borderHair}`,
      }}>
        {["Job", "Schedule", "Last run", "Durée", "Statut"].map((h, i) => (
          <span key={i} style={{
            fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.10em", textTransform: "uppercase",
            color: T.inkTertiary,
            textAlign: ["Durée", "Statut"].includes(h) ? "right" : "left",
          }}>{h}</span>
        ))}
      </div>
      {crons.map((c, i) => (
        <div key={c.name} style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 80px 80px",
          gap: 12, alignItems: "center",
          padding: "10px 16px",
          borderBottom: `1px solid ${T.borderUltra}`,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.01em",
          }}>{c.name}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary,
            fontWeight: 600,
          }}>{c.schedule}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 11, color: T.inkSecondary,
            fontWeight: 600,
          }}>{c.lastRun}</span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 11, color: T.inkSecondary,
            fontWeight: 700, textAlign: "right",
          }}>{c.durationMs}ms</span>
          <div style={{ textAlign: "right" }}>
            <MetricChip variant="positive">{c.status}</MetricChip>
          </div>
        </div>
      ))}
    </section>
  );
};

const DevTelegramPanel = () => {
  const tg = MOCK.dev.telegram;
  return (
    <section style={{
      paddingTop: 32, paddingBottom: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
      }}>
        <div>
          <Eyebrow>II · Telegram</Eyebrow>
          <h2 style={{
            margin: "8px 0 16px 0",
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
            color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
          }}>
            <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>{tg.dispatchedToday} alertes</em>
            {" "}envoyées aujourd'hui.
          </h2>
          <div style={{
            padding: "16px 18px", backgroundColor: T.bgPour,
            border: `1px solid rgba(31,74,46,0.15)`, borderRadius: 12,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: `1px solid rgba(0,0,0,0.06)`,
            }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Bot actif</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.forestGreen, fontWeight: 700 }}>OUI</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: `1px solid rgba(0,0,0,0.06)`,
            }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Chat ID</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>{tg.chatId}</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
            }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Dernier envoi</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>{tg.lastDispatched}</span>
            </div>
          </div>
        </div>
        <div>
          <Eyebrow color={T.inkTertiary}>Dernières alertes envoyées</Eyebrow>
          <div style={{ marginTop: 12 }}>
            {tg.recent.map((r, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "60px 70px 1fr auto",
                gap: 12, alignItems: "center", padding: "10px 0",
                borderBottom: `1px solid ${T.borderUltra}`,
                borderTop: i === 0 ? `1px solid ${T.borderUltra}` : "none",
              }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary, fontWeight: 700 }}>{r.time}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>{r.ticker}</span>
                <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkSecondary, fontWeight: 500 }}>{r.kind.replace(/_/g, " ").toLowerCase()}</span>
                <CheckCircle2 size={13} color={T.forestGreen} strokeWidth={2.2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const DevAlertsToday = () => {
  const a = MOCK.dev.alertsToday;
  return (
    <section style={{
      paddingTop: 32, paddingBottom: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>III · Alertes du jour</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>{a.generated} alertes</em>
          {" "}générées · {a.sent} envoyées · {a.dismissed} dismissed.
        </h2>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12,
      }}>
        {[
          { label: "Générées", value: a.generated, color: T.inkPrimary, bg: T.bgSubtle, accent: T.inkSecondary },
          { label: "Envoyées", value: a.sent, color: T.forestGreen, bg: T.bgPour, accent: T.forestGreen },
          { label: "Dismissed", value: a.dismissed, color: T.amber, bg: T.bgAlert, accent: T.amber },
          { label: "J+1 pending", value: a.pendingJ1, color: T.inkPrimary, bg: T.bgSubtle, accent: T.gold },
          { label: "J+5 pending", value: a.pendingJ5, color: T.inkPrimary, bg: T.bgSubtle, accent: T.gold },
        ].map((m, i) => (
          <div key={i} style={{
            position: "relative",
            padding: "14px 16px 14px 18px",
            backgroundColor: m.bg,
            border: `1px solid ${T.borderUltra}`,
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              backgroundColor: m.accent,
            }} />
            <div style={{
              fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
              color: T.inkTertiary, letterSpacing: "0.10em", textTransform: "uppercase",
            }}>{m.label}</div>
            <div style={{
              marginTop: 6, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400,
              color: m.color, letterSpacing: "-0.022em", lineHeight: 1,
            }}>{m.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

const DevAccountsModes = () => (
  <section style={{
    paddingTop: 32, paddingBottom: 32,
    borderBottom: `1px solid ${T.borderUltra}`,
  }}>
    <div style={{ marginBottom: 18 }}>
      <Eyebrow>IV · Comptes brokers</Eyebrow>
      <h2 style={{
        margin: "8px 0 0 0",
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
        color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
      }}>
        <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>4 comptes</em>
        {" "}avec niveaux d'autonomie progressifs.
      </h2>
    </div>
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
    }}>
      {MOCK.dev.accountsModes.map((acc, i) => {
        const modeColor = acc.mode === "FULL_AUTO" ? T.forestGreen :
                         acc.mode === "SEMI_AUTO" ? T.gold : T.inkSecondary;
        const modeBg = acc.mode === "FULL_AUTO" ? T.bgPour :
                      acc.mode === "SEMI_AUTO" ? "rgba(125,102,40,0.06)" : T.bgSubtle;
        return (
          <div key={acc.name} style={{
            position: "relative",
            padding: "14px 18px 14px 20px",
            backgroundColor: modeBg,
            border: `1px solid ${T.borderUltra}`,
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              backgroundColor: modeColor,
            }} />
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 6,
            }}>
              <span style={{
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700,
                color: T.inkPrimary,
              }}>{acc.name}</span>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                color: modeColor, letterSpacing: "0.08em",
                padding: "2px 7px", backgroundColor: T.bgSurface,
                borderRadius: 4, border: `1px solid ${modeColor}40`,
              }}>{acc.mode}</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: FONT_MONO, fontSize: 11, color: T.inkSecondary, fontWeight: 600,
            }}>
              <span>last sync: {acc.lastSync}</span>
              <span style={{ color: acc.status === "OK" ? T.forestGreen : T.amber, fontWeight: 700 }}>{acc.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const DevSecurityPanel = () => {
  const s = MOCK.dev.security;
  return (
    <section style={{
      paddingTop: 32, paddingBottom: 32,
      borderBottom: `1px solid ${T.borderUltra}`,
    }}>
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>V · Sécurité Supabase</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
        }}>
          <em style={{ color: T.forestGreen, fontStyle: "italic", fontWeight: 400 }}>61 / 61 tables</em>
          {" "}protégées · audit du 9 mai.
        </h2>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      }}>
        <div style={{
          padding: "16px 18px", backgroundColor: T.bgPour,
          border: `1px solid rgba(31,74,46,0.15)`, borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <CheckCircle2 size={13} color={T.forestGreen} strokeWidth={2.2} />
            <Eyebrow color={T.forestGreen}>Bypass RLS (autorisés)</Eyebrow>
          </div>
          {s.bypassRoles.map((r) => (
            <div key={r} style={{
              padding: "6px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`,
              fontFamily: FONT_MONO, fontSize: 12, color: T.forestGreen, fontWeight: 700,
            }}>{r}</div>
          ))}
        </div>
        <div style={{
          padding: "16px 18px", backgroundColor: T.bgContre,
          border: `1px solid rgba(95,34,34,0.15)`, borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <XCircle size={13} color={T.burgundy} strokeWidth={2.2} />
            <Eyebrow color={T.burgundy}>Bloqués (deny-all)</Eyebrow>
          </div>
          {s.blockedRoles.map((r) => (
            <div key={r} style={{
              padding: "6px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`,
              fontFamily: FONT_MONO, fontSize: 12, color: T.burgundy, fontWeight: 700,
            }}>{r}</div>
          ))}
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: "10px 14px",
        fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 13.5,
        color: T.inkSecondary, lineHeight: 1.5, letterSpacing: "-0.005em",
      }}>
        « Dernier audit : {s.lastAudit}. Snapshot rollback disponible dans nx_backup.session_snapshots. »
      </div>
    </section>
  );
};

const DevEodhdPanel = () => {
  const e = MOCK.dev.eodhdMigration;
  return (
    <section style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>VI · Migration data provider</Eyebrow>
        <h2 style={{
          margin: "8px 0 0 0",
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
          color: T.inkPrimary, letterSpacing: "-0.018em", lineHeight: 1.15,
        }}>
          {e.provider} ·{" "}
          <em style={{ color: T.gold, fontStyle: "italic", fontWeight: 400 }}>shadow mode</em>
          {" "}({e.progress}%).
        </h2>
      </div>
      <div style={{
        padding: "20px 24px", backgroundColor: "rgba(125,102,40,0.06)",
        border: `1px solid rgba(125,102,40,0.18)`, borderRadius: 12,
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24,
          marginBottom: 16,
        }}>
          <div>
            <Eyebrow color={T.gold}>Cutover prévu</Eyebrow>
            <div style={{
              marginTop: 6, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.inkPrimary, letterSpacing: "-0.020em", lineHeight: 1,
            }}>{e.cutoverDate}</div>
          </div>
          <div>
            <Eyebrow color={T.gold}>Économie mensuelle</Eyebrow>
            <div style={{
              marginTop: 6, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.forestGreen, letterSpacing: "-0.020em", lineHeight: 1,
            }}>{e.monthlySavings}</div>
          </div>
          <div>
            <Eyebrow color={T.gold}>Statut</Eyebrow>
            <div style={{
              marginTop: 6, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400,
              color: T.gold, letterSpacing: "-0.020em", lineHeight: 1,
              textTransform: "capitalize",
            }}>{e.status.replace(/_/g, " ")}</div>
          </div>
        </div>
        <div style={{
          height: 6, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 3,
          overflow: "hidden",
        }}>
          <div style={{
            width: `${e.progress}%`, height: "100%",
            backgroundColor: T.gold,
            transition: "width 600ms ease-out",
          }} />
        </div>
      </div>
    </section>
  );
};

const DevAdminPage = () => (
  <main style={{
    maxWidth: CONTAINER_MAX, margin: "0 auto",
    padding: `0 ${CONTAINER_PAD}px`,
  }}>
    <DevHeader />
    <DevPipelineKPIs />
    <DevCronsTable />
    <DevTelegramPanel />
    <DevAlertsToday />
    <DevAccountsModes />
    <DevSecurityPanel />
    <DevEodhdPanel />
  </main>
);

/* ============================================================
   APP ROOT (navigable entre 5 pages + détail asset + dev/admin)
   ============================================================ */
export default function NexialDesktopComplete() {
  const [currentPage, setCurrentPage] = useState("today");
  const [detailTicker, setDetailTicker] = useState(null);
  const showDetail = (t) => setDetailTicker(t);
  const closeDetail = () => setDetailTicker(null);
  const navigate = (p) => { setDetailTicker(null); setCurrentPage(p); };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const alertId = params.get("alert");
    const modal = params.get("modal");

    if (alertId) {
      setDetailTicker(null);
      setCurrentPage("today");
      // TODO Phase 1: if modal=order, resolve alert_id -> ticker and open the order modal.
      if (modal === "order") return;
    }
  }, []);

  const renderPage = () => {
    if (detailTicker) return <AssetDetailPage ticker={detailTicker} onBack={closeDetail} />;
    if (currentPage === "dashboard") return <TableauPage onNavigate={navigate} />;
    if (currentPage === "today") return <AujourdhuiPage onNavigate={navigate} onAssetClick={showDetail} />;
    if (currentPage === "orders") return <OrdresPage />;
    if (currentPage === "portfolio") return <PortefeuillePage onAssetClick={showDetail} />;
    if (currentPage === "watchlist") return <WatchlistPage onAssetClick={showDetail} />;
    return <DevAdminPage />;
  };

  // Onglet TopNav actif : si on est sur dev ou détail asset, ne rien activer dans TopNav
  const topNavActive = currentPage === "dev" || detailTicker ? null : currentPage;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: T.bgCanvas,
      fontFamily: FONT_SANS, color: T.inkPrimary,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }}>
      <TopNav active={topNavActive} onNavigate={navigate} />
      {renderPage()}
      <footer style={{
        marginTop: 12,
        padding: "28px 0 36px", textAlign: "center",
        fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 12.5,
        color: T.inkSecondary, letterSpacing: "-0.005em",
        backgroundColor: T.bgSubtle,
        borderTop: `2px solid ${T.forestGreen}`,
      }}>
        Nexial · Olivier · investissement de conviction · horizon 10–15 ans
        {" · "}
        <button
          onClick={() => navigate("dev")}
          style={{
            background: "transparent", border: "none", padding: 0,
            cursor: "pointer", fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 12.5,
            color: currentPage === "dev" ? T.burgundy : T.inkQuaternary,
            letterSpacing: "-0.005em",
            textDecoration: currentPage === "dev" ? "underline" : "none",
          }}
        >
          Dev
        </button>
      </footer>
    </div>
  );
}
