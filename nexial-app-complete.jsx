import React, { useState, useMemo } from "react";
import {
  ArrowUpRight, ChevronRight, Wallet, Sparkles, Activity,
  ArrowLeft, Home, ListChecks, Eye, Briefcase, ChevronDown,
  Award, LayoutGrid, List, Filter, Clock, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, AlertCircle, Search,
  Plus, X, Trash2, Edit3, MoreHorizontal, RefreshCw,
  Zap, Flame, Repeat, ShieldCheck,
} from "lucide-react";
import { useProposalActions } from "@/lib/hooks/useProposalActions";
import { useActiveOrders } from "@/lib/hooks/useActiveOrders";
import { useTodayDashboard } from "@/lib/hooks/useTodayDashboard";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import { useWatchlistItems } from "@/lib/hooks/useWatchlistItems";
import { useAssetSearch } from "@/lib/hooks/useAssetSearch";
import { useAssetDetail } from "@/lib/hooks/useAssetDetail";
import { createClient } from "@/lib/supabase/client";
import { getTradingContext, matchesTradingContext } from "@/lib/tradingContext";
import AssetDebugAdminCard from "@/components/AssetDebugAdminCard";
import SystemFreshnessBadge from "@/components/SystemFreshnessBadge";
import NotificationBellPanel from "@/components/NotificationBellPanel";
import { toast } from "sonner";

const DEFAULT_TRADING_CONTEXT = getTradingContext();

/**
 * NEXIAL — APP PROTOTYPE COMPLÈTE V2
 * Foundation pack étendu : nav + 5 pages uniformisées
 *  - Dashboard (validé v2 contraste)
 *  - Aujourd'hui (alertes du jour)
 *  - Ordres (paper + réels)
 *  - Portefeuille (positions par compte)
 *  - Watchlist (univers surveillé)
 *  + Page détail asset (depuis n'importe quel ticker cliquable)
 *
 * 8 mai 2026 — design system ADR-8 LOCKED v2 contraste renforcé
 * Données réelles 8 mai 2026 from Supabase (kttdmeyrhndufymgoxqk)
 */

// ============================================================
// TOKENS (inlinés pour artifact)
// ============================================================
const T = {
  bgCanvas: "#FBF9F4", bgSurface: "#FFFFFF",
  bgPour: "#DDE9D8", bgContre: "#EFE5D2", bgAlert: "#FBE9C1",
  bgDarkPanel: "#0F1410", bgHover: "#F8F5EC",
  borderSubtle: "#D4CCB8", borderHair: "#A89E84", borderStrong: "#0A0A0A",
  inkPrimary: "#0A0A0A", inkSecondary: "#3A3A3A", inkTertiary: "#6B6B6B",
  inkQuaternary: "#9A9180", inkOnDark: "#FBF9F4",
  forestGreen: "#1F4A2E", forestGreenLight: "#3D7553",
  forestGreenPale: "#7AA886", forestGreenOnDark: "#A8C4B0",
  burgundy: "#5F2222", burgundyLight: "#8A4040",
  amber: "#8B5E0A", amberPale: "#F5E5BA", gold: "#7D6628",
};
const FONT_DISPLAY = '"Fraunces", "Tobias", "Playfair Display", Georgia, serif';
const FONT_SANS = '"Inter", "Söhne", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", "SF Mono", ui-monospace, monospace';

const normalizeAssetIdentity = (value) => (
  value === undefined || value === null ? "" : String(value).trim().toUpperCase()
);

const assetIdentityKeys = (asset) => {
  const strongKeys = [
    asset?.asset_id,
    asset?.assetId,
    asset?.ticker,
    asset?.symbol,
  ].map(normalizeAssetIdentity).filter(Boolean);

  const fallbackKeys = [
    asset?.asset_name,
    asset?.name,
  ].map(normalizeAssetIdentity).filter(Boolean);

  return [...new Set(strongKeys.length > 0 ? strongKeys : fallbackKeys)];
};

const assetIdentityKey = (asset) => assetIdentityKeys(asset)[0] || "";

const dedupeAssets = (items = [], seen = new Set()) => (
  (items || []).filter((item) => {
    const keys = assetIdentityKeys(item);
    if (keys.length === 0) return true;
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  })
);

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

// ============================================================
// MOCK DATA (réelles 8 mai 2026)
// ============================================================
const PORTFOLIO = { totalEur: 149903, pnlEur: 24758, pnlPct: 19.8, cashEur: 25084 };
const ACCOUNTS = [
  { name: "PEA", broker: "Boursobank", value: 129475, share: 86.4, kind: "pea" },
  { name: "CTO IBKR", broker: "IBKR", value: 19056, share: 12.7, kind: "cto" },
  { name: "CTO Trade Republic", broker: "Trade Republic", value: 1372, share: 0.9, kind: "cto" },
];

const ACTIONS_TODAY = [
  { type: "ORDER", ticker: "ISRG", name: "Intuitive Surgical", title: "Plan d'ordres prêt",
    detail: "3 paliers étagés sur faiblesse · qualité ULTRA_PREMIUM", palier1: 446, badge: "À VALIDER" },
  { type: "ORDER", ticker: "OR", name: "L'Oréal", title: "Plan d'ordres prêt",
    detail: "3 paliers étagés sur faiblesse · qualité ULTRA_PREMIUM", palier1: 359, badge: "À VALIDER" },
  { type: "ALERT", ticker: "AI", name: "Air Liquide", title: "Signal de retournement",
    detail: "RSI 27 survendu · score combiné 53 · à confirmer J+1", badge: "À EXAMINER" },
];

const TIMELINE = [
  { time: "Aujourd'hui", text: "MELI a chuté de 12.7% — flash drop détecté", isToday: true },
  { time: "Aujourd'hui", text: "ISRG, OR — paliers d'ordre calculés et prêts", isToday: true },
  { time: "Aujourd'hui", text: "Régime marché : BULL léger, confiance 65", isToday: true },
  { time: "Hier", text: "9 nouvelles alertes BUY_ZONE générées" },
  { time: "Hier", text: "Decision_outcomes seedés sur 9 alertes (J+1 lundi)" },
];

// Alertes du jour (8 mai 2026)
const ALERTS_TODAY = [
  { id: "mock-mobile-meli", status: "NEW", ticker: "MELI", name: "MercadoLibre", kind: "FLASH_DROP", score: 62.5, price: 1632.03, severity: "critical", created_at: "2026-05-12T09:30:00+02:00" },
  { id: "mock-mobile-crwd", status: "NEW", ticker: "CRWD", name: "CrowdStrike", kind: "OVERBOUGHT_HOLD", score: 100, price: 505.67, severity: "warning", created_at: "2026-05-11T21:48:00+02:00" },
  { id: "mock-mobile-panx", status: "NEW", ticker: "PANX", name: "Amundi Nasdaq-100", kind: "OVERBOUGHT_HOLD", score: 85, price: 75.86, severity: "warning", created_at: "2026-05-10T20:15:00+02:00" },
  { id: "mock-mobile-nvda", status: "NEW", ticker: "NVDA", name: "Nvidia", kind: "OVERBOUGHT_HOLD", score: 80, price: 211.60, severity: "warning", created_at: "2026-05-10T18:55:00+02:00" },
  { id: "mock-mobile-snow", status: "NEW", ticker: "SNOW", name: "Snowflake", kind: "OVERBOUGHT_HOLD", score: 73, price: 153.82, severity: "warning", created_at: "2026-05-09T18:20:00+02:00" },
  { id: "mock-mobile-rf", status: "NEW", ticker: "RF", name: "Eurazeo", kind: "OVERBOUGHT_HOLD", score: 65, price: 48.32, severity: "warning", created_at: "2026-05-09T12:10:00+02:00" },
  { id: "mock-mobile-alsti", status: "NEW", ticker: "ALSTI", name: "STIF", kind: "OVERBOUGHT_HOLD", score: 65, price: 50.25, severity: "warning", created_at: "2026-05-08T22:15:00+02:00" },
  { id: "mock-mobile-mc", status: "NEW", ticker: "MC", name: "LVMH", kind: "OVERBOUGHT_HOLD", score: 40, price: 478.30, severity: "info", created_at: "2026-05-08T16:40:00+02:00" },
];

// Positions du portefeuille
const POSITIONS = [
  { ticker: "ASML", name: "ASML Holding", account: "PEA", value: 38263, pnlPct: 112.1 },
  { ticker: "MC", name: "LVMH", account: "PEA", value: 17490, pnlPct: -3.27 },
  { ticker: "AI", name: "Air Liquide", account: "PEA", value: 15761, pnlPct: 6.69 },
  { ticker: "RMS", name: "Hermès", account: "PEA", value: 11627, pnlPct: -7.59 },
  { ticker: "SU", name: "Schneider Electric", account: "PEA", value: 10631, pnlPct: 24.02 },
  { ticker: "PANX", name: "Amundi Nasdaq-100", account: "PEA", value: 8858, pnlPct: -7.70 },
  { ticker: "WPEA", name: "iShares MSCI World", account: "PEA", value: 7681, pnlPct: 12.42 },
  { ticker: "ALSTI", name: "STIF", account: "PEA", value: 6363, pnlPct: -2.32 },
];

// Paper orders en attente
const PAPER_ORDERS = [
  { ticker: "ISRG", palier: 1, limit: 446.21, current: 453.27, dist: -1.56, qty: 2, expires: "2026-05-22" },
  { ticker: "ISRG", palier: 2, limit: 432.09, current: 453.27, dist: -4.67, qty: 2, expires: "2026-05-22" },
  { ticker: "ISRG", palier: 3, limit: 410.92, current: 453.27, dist: -9.34, qty: 2, expires: "2026-05-22" },
  { ticker: "OR", palier: 1, limit: 359.44, current: 363.00, dist: -0.98, qty: 3, expires: "2026-05-22" },
  { ticker: "OR", palier: 2, limit: 352.31, current: 363.00, dist: -2.94, qty: 2, expires: "2026-05-22" },
  { ticker: "OR", palier: 3, limit: 341.62, current: 363.00, dist: -5.89, qty: 2, expires: "2026-05-22" },
];

// Watchlist (top quality univers)
const WATCHLIST = [
  { ticker: "AI", name: "Air Liquide", state: "OPPORTUNITY_LIGHT", score: 46, quality: "PREMIUM", sector: "Industrials", price: 175.12, isHeld: true },
  { ticker: "TTE", name: "TotalEnergies", state: "OPPORTUNITY_LIGHT", score: 36, quality: "PREMIUM", sector: "Energy", price: 75.80, isHeld: true },
  { ticker: "META", name: "Meta", state: "OPPORTUNITY_LIGHT", score: 28, quality: "ULTRA_PREMIUM", sector: "Technology", price: 616.59, isHeld: true },
  { ticker: "OR", name: "L'Oréal", state: "WATCH_BORDERLINE", score: 23, quality: "ULTRA_PREMIUM", sector: "Consumer", price: 363.00, isHeld: false },
  { ticker: "ISRG", name: "Intuitive Surgical", state: "WATCH_BORDERLINE", score: 22, quality: "ULTRA_PREMIUM", sector: "Healthcare", price: 453.27, isHeld: false },
  { ticker: "ADYEN", name: "Adyen", state: "NEUTRAL", score: 20, quality: "PREMIUM", sector: "Financial", price: 942.80, isHeld: false },
  { ticker: "PRX", name: "Prosus", state: "NEUTRAL", score: 19, quality: "PREMIUM", sector: "Technology", price: 41.01, isHeld: false },
  { ticker: "V", name: "Visa", state: "NEUTRAL", score: 19, quality: "ULTRA_PREMIUM", sector: "Financial", price: 318.80, isHeld: false },
  { ticker: "AVGO", name: "Broadcom", state: "NEUTRAL", score: 18, quality: "ULTRA_PREMIUM", sector: "Semiconductors", price: 412.52, isHeld: true },
  { ticker: "MSFT", name: "Microsoft", state: "NEUTRAL", score: 11, quality: "ULTRA_PREMIUM", sector: "Technology", price: 420.86, isHeld: true },
];

const TICKER_NAMES = {
  ISRG: "Intuitive Surgical", MC: "LVMH", OR: "L'Oréal",
  AI: "Air Liquide", ASML: "ASML", RMS: "Hermès",
  SU: "Schneider Electric", PANX: "Pantheon", WPEA: "Amundi PEA World",
  ALSTI: "Stif", NVDA: "Nvidia", META: "Meta",
  CRWD: "CrowdStrike", SNOW: "Snowflake", MELI: "MercadoLibre",
  TTE: "TotalEnergies", RF: "Eurofins",
};

const ASSET_DETAILS = {
  ISRG: {
    ticker: "ISRG", name: "Intuitive Surgical", sector: "Healthcare",
    exchange: "NASDAQ", currency: "USD", currentPrice: 453.27,
    scoreCombined: 53, qualityClass: "ULTRA_PREMIUM",
    state: "WATCH_BORDERLINE", marketRegime: "BULL", isHeld: false,
    chg1d: 0.37, chg5d: -1.00, chg10d: -3.76,
    dist52wHigh: -24.94, dist52wLow: 5.94,
    rsi14: 51, bollingerPctB: 27, atr14: 14.11,
    momentumScore: 18, volumeScore: 50, structureScore: 42, fundamentalScore: 78,
    paliers: [
      { rank: 1, role: "Probabiliste", price: 446.21, dist: -1.56, size: 40,
        proposal_id: null,
        desc: "Première entrée probable, exécution sans agressivité" },
      { rank: 2, role: "Opportuniste", price: 432.09, dist: -4.67, size: 35,
        proposal_id: null,
        desc: "Vraie zone asymétrique sur capitulation modérée" },
      { rank: 3, role: "Panic flush", price: 410.92, dist: -9.34, size: 25,
        proposal_id: null,
        desc: "Excès rare marché, faible probabilité mais forte asymétrie" },
    ],
    thesis: "Compounder qualité ultra-premium en repli. Chirurgie robotique structurellement en croissance. Repli de -25% depuis le sommet 52s offre une fenêtre d'accumulation graduée.",
    pour: [
      "Quality class ULTRA_PREMIUM (top 5% univers Nexial)",
      "Score fondamental 78 — santé financière exceptionnelle",
      "Repli -25% depuis 52w high : fenêtre rare d'accumulation",
    ],
    contre: [
      "Score combiné 53 reste modéré — pas de signal d'achat franc",
      "Bollinger 27% indique mid-range, pas de capitulation visible",
      "RSI 51 neutre — manque de sur-vente confirmée",
    ],
  },
  MC: {
    ticker: "MC", name: "LVMH", sector: "Luxe",
    exchange: "Euronext Paris", currency: "EUR", currentPrice: 612.40,
    scoreCombined: 71, qualityClass: "ULTRA_PREMIUM",
    state: "BUY_ZONE_PROBA", marketRegime: "BULL", isHeld: true,
    chg1d: -0.85, chg5d: -3.20, chg10d: -7.45,
    dist52wHigh: -18.30, dist52wLow: 12.10,
    rsi14: 38, bollingerPctB: 18, atr14: 9.85,
    momentumScore: 32, volumeScore: 65, structureScore: 58, fundamentalScore: 88,
    paliers: [
      { rank: 1, role: "Probabiliste", price: 605.00, dist: -1.21, size: 40,
        proposal_id: null,
        desc: "Renforcement sur faiblesse modérée du compounder européen" },
      { rank: 2, role: "Opportuniste", price: 588.50, dist: -3.90, size: 35,
        proposal_id: null,
        desc: "Asymétrie favorable sur pullback Chine/luxe" },
      { rank: 3, role: "Panic flush", price: 565.00, dist: -7.74, size: 25,
        proposal_id: null,
        desc: "Capitulation rare sur le leader mondial du luxe" },
    ],
    thesis: "Pullback historique sur le compounder européen le plus solide. Marques iconiques, pricing power, expansion Asie intacte malgré ralentissement Chine.",
    pour: [
      "Score fondamental 88 — bilan irréprochable, marges record",
      "Quality class ULTRA_PREMIUM, pricing power durable",
      "RSI 38 + Bollinger 18% : zone de sur-vente claire",
    ],
    contre: [
      "Exposition Chine 35% — vent contraire macro persistant",
      "Multiple PE 22x reste élevé vs moyenne historique 18x",
      "Pas encore de bottom technique confirmé sur le daily",
    ],
  },
  OR: {
    ticker: "OR", name: "L'Oréal", sector: "Cosmétiques",
    exchange: "Euronext Paris", currency: "EUR", currentPrice: 378.55,
    scoreCombined: 64, qualityClass: "PREMIUM",
    state: "WATCH_BUY_ZONE", marketRegime: "BULL", isHeld: true,
    chg1d: 0.12, chg5d: -2.10, chg10d: -5.30,
    dist52wHigh: -15.20, dist52wLow: 8.40,
    rsi14: 44, bollingerPctB: 32, atr14: 6.20,
    momentumScore: 28, volumeScore: 52, structureScore: 48, fundamentalScore: 82,
    paliers: [
      { rank: 1, role: "Probabiliste", price: 372.00, dist: -1.73, size: 40,
        proposal_id: null,
        desc: "Entrée graduée sur consolidation saine" },
      { rank: 2, role: "Opportuniste", price: 360.00, dist: -4.90, size: 35,
        proposal_id: null,
        desc: "Vraie zone d'achat sur faiblesse temporaire" },
      { rank: 3, role: "Panic flush", price: 345.00, dist: -8.86, size: 25,
        proposal_id: null,
        desc: "Excès rare, probabilité faible mais asymétrie forte" },
    ],
    thesis: "Leader mondial cosmétique avec exposition équilibrée toutes zones géographiques. Modèle défensif avec croissance organique régulière 6-8% par an.",
    pour: [
      "Score fondamental 82 — résilience prouvée toutes conditions",
      "Diversification géographique exceptionnelle (pas de risque pays)",
      "Track record dividende 30+ ans, ratio dette saine",
    ],
    contre: [
      "Score combiné 64 sans signal d'achat franc à ce stade",
      "Pas de catalyseur identifié court terme pour outperformance",
      "RSI 44 et Bollinger 32% : zone neutre, attendre meilleur point",
    ],
  },
};

const buildFallbackAsset = (ticker) => ({
  ticker,
  isFallback: true,
  name: TICKER_NAMES[ticker] ?? ticker,
  sector: "—",
  exchange: "—",
  currency: "EUR",
  currentPrice: 0,
  scoreCombined: 0,
  qualityClass: "—",
  state: "—",
  marketRegime: "—",
  isHeld: false,
  chg1d: 0, chg5d: 0, chg10d: 0,
  dist52wHigh: 0, dist52wLow: 0,
  rsi14: 0, bollingerPctB: 0, atr14: 0,
  momentumScore: 0, volumeScore: 0, structureScore: 0, fundamentalScore: 0,
  paliers: [],
  thesis: "Fiche détaillée non disponible en démo. Live data en cours de branchement pour cet actif.",
  pour: [],
  contre: [],
});

// ============================================================
// HELPERS
// ============================================================
const fmtEur = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const fmtUsd = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
const fmtDate = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const stateLabel = (state) => {
  const map = {
    OPPORTUNITY_LIGHT: "Opportunité",
    OPPORTUNITY_STRONG: "Opportunité forte",
    WATCH_BORDERLINE: "À surveiller",
    NEUTRAL: "Neutre",
    OVERBOUGHT_HOLD: "Sur-acheté",
    OVERBOUGHT_AVOID: "À éviter",
    INSUFFICIENT_DATA: "Données insuffisantes",
  };
  return map[state] || state;
};

const stateVariant = (state) => {
  if (state === "OPPORTUNITY_LIGHT" || state === "OPPORTUNITY_STRONG") return "positive";
  if (state === "WATCH_BORDERLINE") return "warning";
  if (state === "OVERBOUGHT_HOLD" || state === "OVERBOUGHT_AVOID") return "negative";
  return "neutral";
};

const alertKindLabel = (kind) => {
  const map = {
    FLASH_DROP: "Chute brutale",
    OVERBOUGHT_HOLD: "Tension haussière",
    OVERBOUGHT_HOLD_WARNING: "Tension haussière",
    BUY_ZONE_ENTERED: "Zone d'achat",
    REVERSAL_HIGH: "Retournement fort",
    REVERSAL_MEDIUM: "Retournement modéré",
    WATCH_PULLBACK_ENTERED: "Pullback détecté",
    HOT_PULLBACK_ENTERED: "Pullback chaud",
  };
  return map[kind] || kind.replace(/_/g, " ").toLowerCase();
};

// ============================================================
// PRIMITIVES
// ============================================================
const Eyebrow = ({ children, variant = "default", style = {} }) => {
  const colorMap = {
    default: T.inkSecondary, accent: T.forestGreen, danger: T.burgundy,
    warning: T.amber, dark: T.inkOnDark, onDarkAccent: T.forestGreenOnDark,
  };
  return (
    <div style={{
      fontSize: 10.5, fontFamily: FONT_SANS, fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase",
      color: colorMap[variant] || colorMap.default, ...style,
    }}>{children}</div>
  );
};

const HeroNumber = ({ children, size = "XL", color, style = {} }) => {
  const sizeMap = {
    XL: { fontSize: 48, lineHeight: 1.0, letterSpacing: "-0.025em" },
    L: { fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.02em" },
    M: { fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.015em" },
    S: { fontSize: 18, lineHeight: 1.2, letterSpacing: "-0.01em" },
  };
  return (
    <div style={{
      fontFamily: FONT_DISPLAY, fontWeight: 500,
      color: color || T.inkPrimary, ...sizeMap[size], ...style,
    }}>{children}</div>
  );
};

const MetricChip = ({ children, variant = "neutral", style = {} }) => {
  const variantMap = {
    positive: { bg: T.bgPour, fg: T.forestGreen },
    negative: { bg: T.bgContre, fg: T.burgundy },
    neutral: { bg: "#F0EBDF", fg: T.inkSecondary },
    warning: { bg: T.bgAlert, fg: T.amber },
    dark: { bg: "rgba(122, 168, 134, 0.18)", fg: T.forestGreenOnDark },
  };
  const v = variantMap[variant] || variantMap.neutral;
  return (
    <span style={{
      fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
      letterSpacing: "-0.01em", color: v.fg, backgroundColor: v.bg,
      padding: "3px 8px", borderRadius: 4, display: "inline-block", ...style,
    }}>{children}</span>
  );
};

const Badge = ({ children, variant = "default", style = {} }) => {
  const variantMap = {
    default: { bg: T.inkPrimary, fg: T.inkOnDark },
    success: { bg: T.forestGreen, fg: T.inkOnDark },
    warning: { bg: T.amber, fg: T.inkOnDark },
    danger: { bg: T.burgundy, fg: T.inkOnDark },
    outline: { bg: "transparent", fg: T.inkPrimary, border: T.inkPrimary },
    soft: { bg: T.bgSurface, fg: T.inkSecondary, border: T.borderSubtle },
  };
  const v = variantMap[variant] || variantMap.default;
  return (
    <span style={{
      fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.12em", color: v.fg, backgroundColor: v.bg,
      border: v.border ? `1px solid ${v.border}` : "none",
      padding: "5px 9px", borderRadius: 4, flexShrink: 0,
      textTransform: "uppercase", ...style,
    }}>{children}</span>
  );
};

const ScoreBar = ({ label, value, max = 100 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  let color = T.burgundy;
  if (pct >= 70) color = T.forestGreen;
  else if (pct >= 50) color = T.forestGreenLight;
  else if (pct >= 30) color = T.gold;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary,
        fontWeight: 500, width: 96, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, backgroundColor: T.borderSubtle, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color,
          borderRadius: 2, transition: "width 600ms ease-out" }} />
      </div>
      <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: T.inkPrimary,
        fontWeight: 700, width: 32, textAlign: "right" }}>{Math.round(value)}</span>
    </div>
  );
};

const ScoreGauge = ({ value, max = 100, size = 88 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  let color = T.burgundy;
  if (pct >= 70) color = T.forestGreen;
  else if (pct >= 50) color = T.forestGreenLight;
  else if (pct >= 30) color = T.gold;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={T.borderSubtle} strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: size * 0.32, fontWeight: 500,
          color: T.inkPrimary, lineHeight: 1, letterSpacing: "-0.02em" }}>{Math.round(value)}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 9, color: T.inkTertiary,
          fontWeight: 600, letterSpacing: "0.08em", marginTop: 1 }}>/{max}</div>
      </div>
    </div>
  );
};

// PageHeader réutilisable pour les pages internes
const PageHeader = ({ eyebrow, title, subtitle, action }) => (
  <header style={{ padding: "28px 20px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <HeroNumber size="L" style={{ margin: "8px 0 4px" }}>{title}</HeroNumber>
        {subtitle && (
          <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: T.inkTertiary }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  </header>
);

const RefreshButton = ({ onRefresh, refreshing = false }) => (
  <button
    type="button"
    onClick={onRefresh}
    disabled={refreshing}
    aria-label="Rafraichir"
    title="Rafraichir"
    style={{
      width: 36, height: 36, borderRadius: 8,
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

  React.useEffect(() => {
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

// SegmentedControl pour toggles (carte/liste, filtres)
const SegmentedControl = ({ options, value, onChange }) => (
  <div style={{
    display: "inline-flex", padding: 3, backgroundColor: T.bgSurface,
    border: `1px solid ${T.borderSubtle}`, borderRadius: 8, gap: 2,
  }}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: "6px 12px", borderRadius: 6, border: "none",
          backgroundColor: active ? T.inkPrimary : "transparent",
          color: active ? T.inkOnDark : T.inkSecondary,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: active ? 700 : 500,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          transition: "all 200ms",
        }}>
          {opt.icon}
          {opt.label}
        </button>
      );
    })}
  </div>
);

// FilterChip (filtre cliquable rond)
const FilterChip = ({ children, active, onClick, count }) => (
  <button onClick={onClick} style={{
    padding: "7px 12px", borderRadius: 999,
    backgroundColor: active ? T.inkPrimary : T.bgSurface,
    color: active ? T.inkOnDark : T.inkSecondary,
    border: `1px solid ${active ? T.inkPrimary : T.borderSubtle}`,
    fontFamily: FONT_SANS, fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
    whiteSpace: "nowrap",
  }}>
    {children}
    {count !== undefined && (
      <span style={{
        fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
        color: active ? T.forestGreenOnDark : T.inkTertiary,
        marginLeft: 2,
      }}>{count}</span>
    )}
  </button>
);

const FilterBar = ({ filters = [], sortOptions = [], activeFilters = [], activeSort, onChange }) => (
  <div style={{
    padding: "0 20px 12px",
    display: "flex", alignItems: "center", gap: 8,
    overflowX: "auto",
  }}>
    {sortOptions.length > 0 && (
      <select
        value={activeSort}
        onChange={(e) => onChange({ sort: e.target.value })}
        style={{
          flexShrink: 0, padding: "8px 10px",
          border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
          backgroundColor: T.bgSurface, color: T.inkPrimary,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
        }}
      >
        {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    )}
    {filters.map((filter) => (
      <FilterChip
        key={filter.key}
        active={activeFilters.includes(filter.key)}
        count={filter.count}
        onClick={() => onChange({ filter: filter.key })}
      >
        {filter.label}
      </FilterChip>
    ))}
  </div>
);

// Empty state premium
const EmptyState = ({ icon: Icon, title, message, action }) => (
  <div style={{
    padding: "48px 24px", textAlign: "center", display: "flex",
    flexDirection: "column", alignItems: "center", gap: 12,
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={22} strokeWidth={1.6} color={T.inkTertiary} />
    </div>
    <HeroNumber size="M">{title}</HeroNumber>
    <p style={{
      fontFamily: FONT_SANS, fontSize: 13, color: T.inkSecondary,
      fontWeight: 500, lineHeight: 1.5, maxWidth: 280, margin: 0,
    }}>{message}</p>
    {action}
  </div>
);

// ============================================================
// NAV BOTTOM
// ============================================================
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: "10px 4px 8px", display: "flex",
    flexDirection: "column", alignItems: "center", gap: 4,
    background: "none", border: "none", cursor: "pointer",
    color: active ? T.inkPrimary : T.inkTertiary,
  }}>
    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
    <span style={{
      fontFamily: FONT_SANS, fontSize: 10, fontWeight: active ? 700 : 500,
      letterSpacing: "0.02em",
    }}>{label}</span>
  </button>
);

const BottomNav = ({ currentPage, onNavigate }) => (
  <nav style={{
    position: "sticky", bottom: 0, backgroundColor: T.bgSurface,
    borderTop: `1px solid ${T.borderSubtle}`, display: "flex", paddingBottom: 4,
    boxShadow: "0 -1px 0 rgba(0,0,0,0.02)",
  }}>
    <NavItem icon={Home} label="Tableau" active={currentPage === "dashboard"} onClick={() => onNavigate("dashboard")} />
    <NavItem icon={Sparkles} label="Aujourd'hui" active={currentPage === "today"} onClick={() => onNavigate("today")} />
    <NavItem icon={ListChecks} label="Ordres" active={currentPage === "orders"} onClick={() => onNavigate("orders")} />
    <NavItem icon={Briefcase} label="Portefeuille" active={currentPage === "portfolio"} onClick={() => onNavigate("portfolio")} />
    <NavItem icon={Eye} label="Watchlist" active={currentPage === "watchlist"} onClick={() => onNavigate("watchlist")} />
  </nav>
);

// ============================================================
// PAGE — DASHBOARD (validé V2)
// ============================================================
const DashboardHeader = ({ onRefresh, refreshing }) => {
  const today = useMemo(() => new Date(), []);
  return (
    <header style={{ padding: "28px 20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>Nexial</Eyebrow>
          <HeroNumber size="L" style={{ margin: "8px 0 6px" }}>Bonjour Olivier</HeroNumber>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500,
            color: T.inkTertiary, textTransform: "capitalize",
          }}>{fmtDate(today)}</div>
          <div style={{ marginTop: 12, maxWidth: "100%", overflow: "hidden" }}>
            <MarketStatusIndicator />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7, flexShrink: 0, width: 44 }}>
          <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
          <NotificationBellPanel compact />
          <div style={{ width: 44, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 108, transform: "scale(0.78)", transformOrigin: "top right" }}>
              <SystemFreshnessBadge />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const RegimeBanner = () => (
  <div style={{
    margin: "0 20px 20px", padding: "12px 14px", backgroundColor: T.bgPour,
    borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
    border: `1px solid ${T.forestGreenPale}`,
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: T.forestGreen, flexShrink: 0 }} />
    <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkPrimary, fontWeight: 500 }}>
      Marché en hausse modérée
    </span>
    <span style={{
      fontFamily: FONT_MONO, fontSize: 11.5, color: T.forestGreen,
      fontWeight: 600, marginLeft: "auto",
    }}>sizing ×0.85</span>
  </div>
);

const ActionCard = ({ action, isLast, onClick }) => {
  const isOrder = action.type === "ORDER";
  const accentColor = isOrder ? T.forestGreen : T.amber;
  const accentBg = isOrder ? T.bgPour : T.bgAlert;
  return (
    <div onClick={onClick} style={{
      padding: "18px 20px", backgroundColor: T.bgSurface,
      borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      cursor: "pointer", transition: "background-color 200ms", position: "relative",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.bgSurface}>
      <div style={{
        position: "absolute", left: 0, top: 18, bottom: 18, width: 3,
        backgroundColor: accentColor, borderRadius: "0 2px 2px 0",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, borderRadius: 8, backgroundColor: accentBg, flexShrink: 0,
        }}>
          {isOrder ? <Sparkles size={17} strokeWidth={2} color={accentColor} />
                   : <Activity size={17} strokeWidth={2} color={accentColor} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 13.5, fontWeight: 700,
              color: T.inkPrimary, letterSpacing: "0.02em",
            }}>{action.ticker}</span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
              {action.name}
            </span>
          </div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 500,
            color: T.inkPrimary, letterSpacing: "-0.01em", lineHeight: 1.2,
          }}>{action.title}</div>
        </div>
        <Badge variant={isOrder ? "success" : "warning"}>{action.badge}</Badge>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary,
        lineHeight: 1.5, paddingLeft: 50, fontWeight: 500,
      }}>
        {action.detail}
        {action.palier1 && (<>{" · "}
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>
            1er palier {action.palier1}€
          </span>
        </>)}
      </div>
    </div>
  );
};

const ContextToggle = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 6, padding: "0 20px 12px", overflowX: "auto" }}>
    {[
      { value: null, label: "Auto" },
      { value: "PEA", label: "PEA" },
      { value: "CTO", label: "CTO" },
    ].map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          style={{
            border: `1px solid ${active ? T.forestGreen : T.borderSubtle}`,
            backgroundColor: active ? T.bgPour : T.bgSurface,
            color: active ? T.forestGreen : T.inkSecondary,
            borderRadius: 999,
            padding: "7px 11px",
            fontFamily: FONT_SANS,
            fontSize: 11.5,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const TradingContextNote = ({ context }) => {
  const c = context || DEFAULT_TRADING_CONTEXT;
  return (
    <div style={{
      margin: "0 20px 14px", padding: "10px 12px",
      backgroundColor: T.bgPour, border: `1px solid ${T.borderSubtle}`,
      borderRadius: 10, fontFamily: FONT_SANS, fontSize: 12,
      color: T.inkSecondary, lineHeight: 1.45,
    }}>
      <strong style={{ color: T.forestGreen }}>{c.label}</strong>
      {" - "}{c.opportunityFocus} · {c.watchlistFocus}
    </div>
  );
};

const SectionToDoToday = ({ onAssetClick, opportunities, loading, context }) => {
  const items = opportunities || [];
  // Adapter Supabase row -> ActionCard expected shape
  const adapted = items.slice(0, 5).map((o) => ({
    asset_id: o.asset_id,
    ticker: o.ticker,
    name: o.asset_name,
    type: (o.event_kind && o.event_kind.includes("REVERSAL")) ? "ALERT" : "ORDER",
    title: o.final_action || "Surveiller",
    badge: o.tier === "tier1_core" ? "CORE" : o.tier === "tier2_watch" ? "WATCH" : "—",
    detail: o.thesis ? (o.thesis.length > 100 ? o.thesis.slice(0, 100) + "…" : o.thesis) : "",
    palier1: null,
  }));
  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ padding: "0 20px 14px" }}>
        <Eyebrow variant="accent">À faire aujourd'hui</Eyebrow>
        <HeroNumber size="M" style={{ marginTop: 6 }}>
          {loading ? "Chargement…" : `${adapted.length} ${adapted.length > 1 ? "opportunités" : "opportunité"}`}
        </HeroNumber>
      </div>
      {context && (
        <div style={{ margin: "-8px 20px 12px", fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 600 }}>
          {context.focus}
        </div>
      )}
      {!loading && adapted.length === 0 ? (
        <div style={{ margin: "0 20px", padding: "20px", textAlign: "center", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
          Aucune opportunité détectée pour le moment.
        </div>
      ) : (
        <div style={{
          backgroundColor: T.bgSurface, border: `1.5px solid ${T.inkPrimary}`,
          borderRadius: 12, margin: "0 20px", overflow: "hidden",
        }}>
          {adapted.map((a, i) => (
            <ActionCard key={assetReactKey(a, "dashboard-action", i)} action={a} isLast={i === adapted.length - 1}
              onClick={() => onAssetClick(a.ticker)} />
          ))}
        </div>
      )}
    </section>
  );
};

const AUTOMATION_LABEL = { MANUAL_ONLY: "MAN", SEMI_AUTO: "S-AUTO", FULL_AUTO: "F-AUTO" };

const AccountCard = ({ account, onClick }) => {
  const isInactive = account.total_account_value_eur === 0 && account.positions_count === 0;
  const automationLabel = AUTOMATION_LABEL[account.automation_mode] || account.automation_mode;
  const isClickable = !isInactive;
  const cashBalances = account.cash_balances || [];
  const showMultiCurrency = cashBalances.length > 1;
  const labCapitalNote = account.is_lab && account.lab_max_capital_eur
    ? `capital max €${fmtEur(account.lab_max_capital_eur)}`
    : null;

  return (
    <div
      onClick={isClickable ? () => onClick(account) : undefined}
      style={{
        padding: "16px 18px",
        backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 12,
        marginBottom: 10,
        cursor: isClickable ? "pointer" : "default",
        opacity: isInactive ? 0.6 : 1,
        transition: "background-color 200ms",
      }}
      onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = T.bgHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = T.bgSurface; }}>

      {/* Header: name + automation + universe */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: isInactive ? 4 : 10, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: T.inkPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {account.account_name}
            {account.broker && account.broker !== account.account_name && (
              <span style={{ color: T.inkTertiary, fontWeight: 500 }}> · {account.broker}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: T.inkTertiary, letterSpacing: "0.05em", flexShrink: 0 }}>
          <span>{automationLabel}</span>
          <span style={{ color: T.inkQuaternary }}>·</span>
          <span>{account.universe_short_name}</span>
        </div>
      </div>

      {isInactive ? (
        <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
          Inactif{labCapitalNote ? ` · ${labCapitalNote}` : account.universe === "PAPER_TRADING" ? " · simulation" : ""}
        </div>
      ) : (
        <>
          {/* Investi + Cash totals */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: T.inkPrimary, letterSpacing: "-0.01em" }}>
                €{fmtEur(account.invested_total_eur)}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 }}>
                investi
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: T.inkPrimary, letterSpacing: "-0.01em" }}>
                €{fmtEur(account.cash_total_eur)}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 }}>
                cash
              </div>
            </div>
          </div>

          {/* Cash multi-devise (si applicable) */}
          {showMultiCurrency && (
            <div style={{ marginTop: 4, marginBottom: 8, paddingLeft: 0 }}>
              {cashBalances.map((c, i) => (
                <div key={i} style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: T.inkSecondary, fontWeight: 500, marginTop: 2 }}>
                  └ {c.currency} {fmtEur(c.balance)} <span style={{ color: T.inkTertiary }}>(€{fmtEur(c.balance_eur)})</span>
                </div>
              ))}
            </div>
          )}

          {/* Positions count + chevron */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
              {account.positions_count} position{account.positions_count > 1 ? "s" : ""}
            </div>
            <ChevronRight size={14} strokeWidth={2} color={T.inkTertiary} />
          </div>
        </>
      )}
    </div>
  );
};

const YourMoney = ({ patrimoine, loading }) => {
  const [showAccounts, setShowAccounts] = useState(false);
  const totalEur = patrimoine?.total_eur ?? 0;
  const cashEur = patrimoine?.cash_eur ?? 0;
  const accounts = patrimoine?.accounts ?? [];
  const totalPositions = accounts.reduce((sum, a) => sum + (a.positions_count || 0), 0);

  return (
    <section style={{ marginTop: 36, padding: "0 20px" }}>
      <Eyebrow>Ton argent</Eyebrow>

      {/* Header compact dépliable */}
      <div
        onClick={() => setShowAccounts((s) => !s)}
        style={{
          marginTop: 12,
          padding: "16px 18px",
          backgroundColor: T.bgDarkPanel,
          borderRadius: 12,
          cursor: "pointer",
          transition: "background-color 200ms",
        }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
          {/* Patrimoine total */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.forestGreenPale, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              Patrimoine
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500, color: T.inkOnDark, letterSpacing: "-0.015em" }}>
              {loading ? "…" : `€${fmtEur(totalEur)}`}
            </div>
          </div>

          {/* Séparateur vertical */}
          <div style={{ width: 1, backgroundColor: "rgba(168, 196, 176, 0.25)" }} />

          {/* Cash dispo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.forestGreenPale, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              Cash dispo
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500, color: T.inkOnDark, letterSpacing: "-0.015em" }}>
              {loading ? "…" : `€${fmtEur(cashEur)}`}
            </div>
          </div>
        </div>

        {/* Footer: positions + chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(168, 196, 176, 0.18)" }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.forestGreenPale, fontWeight: 500 }}>
            {loading ? "…" : `${totalPositions} positions sur ${accounts.length} comptes`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: T.inkOnDark, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600 }}>
            {showAccounts ? "Masquer" : "Détail"}
            <ChevronDown size={14} strokeWidth={2.2} style={{ transform: showAccounts ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
          </div>
        </div>
      </div>

      {/* Liste des comptes (dépliable) */}
      {showAccounts && (
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
              Chargement des comptes…
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
              Aucun compte configuré.
            </div>
          ) : (
            accounts.map((acc) => (
              <AccountCard key={acc.account_id} account={acc} />
            ))
          )}
        </div>
      )}
    </section>
  );
};

const Timeline = ({ onSeeAll }) => (
  <section style={{ marginTop: 36, padding: "0 20px 32px" }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
      <Eyebrow>Depuis hier</Eyebrow>
      <button onClick={onSeeAll} style={{
        background: "none", border: "none", fontFamily: FONT_SANS,
        fontSize: 12, color: T.inkPrimary, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 2, padding: 0,
        textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: T.borderHair,
      }}>Tout voir<ChevronRight size={14} strokeWidth={2} /></button>
    </div>
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute", left: 5, top: 8, bottom: 8, width: 1.5,
        backgroundColor: T.borderHair,
      }} />
      {TIMELINE.map((item, i) => (
        <div key={i} style={{
          position: "relative", paddingLeft: 24,
          paddingBottom: i === TIMELINE.length - 1 ? 0 : 16,
        }}>
          <div style={{
            position: "absolute", left: 0, top: 5, width: 11, height: 11,
            borderRadius: "50%",
            backgroundColor: item.isToday ? T.forestGreen : T.bgCanvas,
            border: item.isToday ? `2px solid ${T.forestGreen}` : `2px solid ${T.borderHair}`,
          }} />
          <div style={{
            fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: item.isToday ? T.forestGreen : T.inkTertiary, marginBottom: 4,
          }}>{item.time}</div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 13, color: T.inkPrimary,
            lineHeight: 1.45, fontWeight: 500,
          }}>{item.text}</div>
        </div>
      ))}
    </div>
  </section>
);

const DashboardPage = ({ onAssetClick, onNavigate }) => {
  const [contextOverride, setContextOverride] = useState(null);
  const { opportunities, patrimoine, context, loading, refetch } = useTodayDashboard({ context: contextOverride });
  const { refreshing, handleRefresh } = useManualRefresh(refetch);
  const dashboardOpportunities = useMemo(
    () => dedupeAssets(opportunities),
    [opportunities]
  );

  return (
    <>
      <DashboardHeader onRefresh={handleRefresh} refreshing={refreshing} />
      <RegimeBanner />
      <TradingContextNote context={context} />
      <ContextToggle value={contextOverride} onChange={setContextOverride} />
      <SectionToDoToday onAssetClick={onAssetClick} opportunities={dashboardOpportunities} loading={loading} context={context} />
      <YourMoney patrimoine={patrimoine} loading={loading} />
      <Timeline onSeeAll={() => onNavigate("today")} />
    </>
  );
};

// ============================================================
// PAGE — AUJOURD'HUI (alertes du jour)
// ============================================================
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

const liveAlertNumber = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatAlertTime = (input) => {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const formatAlertPriceFreshness = (input) => {
  if (!input) return "prix live";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "prix live";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `prix maj ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `prix maj ${hours} h`;
  return `prix maj ${Math.round(hours / 24)} j`;
};

const normalizeTodayAlert = (alert) => {
  const kind = alert.alert_kind || alert.kind || "ALERT";
  const createdAt = alert.created_at || alert.detected_at || alert.updated_at || new Date().toISOString();
  const priceFreshAt = alert.price_updated_at || alert.price_as_of || alert.priced_at || alert.updated_at || alert.created_at;
  return {
    ...alert,
    id: alert.id || alert.alert_id,
    ticker: alert.ticker || alert.symbol || alert.asset_ticker,
    name: alert.asset_name || alert.name || alert.ticker || alert.symbol || "Actif",
    kind,
    status: alert.status || "NEW",
    score: liveAlertNumber(alert.opportunity_score, alert.score) ?? 0,
    price: liveAlertNumber(alert.live_price, alert.current_price, alert.price_now, alert.price, alert.price_at_creation) ?? 0,
    price_fresh_at: priceFreshAt,
    price_freshness_label: formatAlertPriceFreshness(priceFreshAt),
    severity: alert.severity || alert.priority || "INFO",
    created_at: createdAt,
    time: alert.time || formatAlertTime(createdAt),
    age_hours: liveAlertNumber(alert.age_hours),
    in_portfolio: alert.in_portfolio ?? alert.is_held ?? alert.isHeld,
    isHeld: alert.isHeld ?? alert.in_portfolio ?? alert.is_held,
  };
};

const useDecisionAlerts = (kinds, statuses) => {
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
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
        const fallback = ALERTS_TODAY
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

  React.useEffect(() => {
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
      textAlign: "left", padding: 14, backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
      cursor: "pointer", minHeight: 128,
    }}>
      <Eyebrow>Regime marche</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: color }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.inkPrimary, lineHeight: 1 }}>{label}</span>
      </div>
      <div style={{ marginTop: 12, fontFamily: FONT_MONO, fontSize: 12, color, fontWeight: 800 }}>
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
      textAlign: "left", padding: 14, backgroundColor: tone === "risk" ? T.bgContre : T.bgPour,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
      cursor: "pointer", minHeight: 128,
    }}>
      <Eyebrow color={color}>{title} ({loading ? "..." : alerts.length})</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
        {alerts.length === 0 ? (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>
            {loading ? "Chargement..." : "Aucun signal"}
          </span>
        ) : alerts.map((alert) => (
          <div key={alert.id} onClick={(e) => { e.stopPropagation(); onAssetClick(alert.ticker); }} style={{
            display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 8, alignItems: "center",
            fontFamily: FONT_SANS, fontSize: 12, color: T.inkPrimary,
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
  const total = patrimoine?.total_eur ?? 0;
  const cash = patrimoine?.cash_eur ?? 0;
  const exposure = total > 0 ? ((patrimoine?.positions_eur ?? 0) / total) * 100 : 0;

  return (
    <button type="button" onClick={onClick} style={{
      textAlign: "left", padding: 14, backgroundColor: T.bgDarkPanel,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
      cursor: "pointer", minHeight: 128,
    }}>
      <Eyebrow color={T.forestGreenOnDark}>Patrimoine</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.forestGreenPale, textTransform: "uppercase", fontWeight: 800 }}>Total</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.inkOnDark, marginTop: 3 }}>{loading ? "..." : `EUR ${fmtEur(total)}`}</div>
        </div>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: T.forestGreenPale, textTransform: "uppercase", fontWeight: 800 }}>Cash</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.inkOnDark, marginTop: 3 }}>{loading ? "..." : `EUR ${fmtEur(cash)}`}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontFamily: FONT_MONO, fontSize: 11.5, color: T.forestGreenOnDark, fontWeight: 800 }}>
        Exposition {loading ? "..." : `${exposure.toFixed(0)}%`}
      </div>
    </button>
  );
};

const DailyDecisionsSection = ({ onNavigate, onAssetClick }) => (
  <section style={{ padding: "0 20px 18px" }}>
    <div style={{ marginBottom: 12 }}>
      <Eyebrow variant="accent">Decisions du jour</Eyebrow>
      <HeroNumber size="M" style={{ marginTop: 6 }}>4 points a verifier</HeroNumber>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
      <MarketRegimeDecisionCard onClick={() => onNavigate("dashboard")} />
      <AlertsDecisionCard title="Opportunites chaudes" kinds={HOT_DECISION_KINDS} statuses={NEW_DECISION_STATUS} onClick={() => onNavigate("today")} onAssetClick={onAssetClick} />
      <AlertsDecisionCard title="Positions a risque" kinds={RISK_DECISION_KINDS} statuses={ACTIVE_DECISION_STATUS} tone="risk" onClick={() => onNavigate("today")} onAssetClick={onAssetClick} />
    </div>
  </section>
);

const DismissAlertModal = ({ alert, onClose, onConfirm }) => {
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
      position: "fixed", inset: 0, zIndex: 80, backgroundColor: "rgba(10,10,10,0.28)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 360, backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
        boxShadow: "0 18px 60px rgba(10,10,10,0.18)", padding: 18,
      }}>
        <h3 style={{
          margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500,
          color: T.inkPrimary,
        }}>Ignorer {alert.ticker} ?</h3>
        <p style={{
          margin: "8px 0 14px", fontFamily: FONT_SANS, fontSize: 13,
          color: T.inkSecondary, lineHeight: 1.4,
        }}>{alert.name} sera retiree de la liste des alertes actives.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Pourquoi ignores-tu cette alerte ?"
          rows={3}
          style={{
            width: "100%", resize: "vertical", border: `1px solid ${T.borderSubtle}`,
            borderRadius: 8, padding: 10, fontFamily: FONT_SANS, fontSize: 13,
            color: T.inkPrimary, backgroundColor: T.bgCanvas, outline: "none",
          }}
        />
        {error && (
          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: 6,
            backgroundColor: T.bgContre, color: T.burgundy,
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={dismissing} style={{
            border: `1px solid ${T.borderSubtle}`, backgroundColor: "transparent",
            color: T.inkSecondary, borderRadius: 6, padding: "8px 12px",
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Annuler</button>
          <button type="button" onClick={handleConfirm} disabled={dismissing} style={{
            border: "none", backgroundColor: T.burgundy, color: T.inkOnDark,
            borderRadius: 6, padding: "8px 12px", fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 700, cursor: dismissing ? "default" : "pointer",
            opacity: dismissing ? 0.7 : 1,
          }}>{dismissing ? "Suppression..." : "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
};

const AlertRow = ({ alert, onClick, isLast, menuOpen, onToggleMenu, onMarkSeen, onDismissRequest }) => {
  const freshness = getAlertFreshness(alert.created_at, alert.age_hours);
  const isSeen = alert.status === "SEEN";

  return (
    <div onClick={onClick} style={{
      padding: "14px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      transition: "background-color 200ms", position: "relative", opacity: isSeen ? 0.7 : 1,
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
      <div style={{
        width: isSeen ? 6 : 8, height: isSeen ? 6 : 8, borderRadius: "50%",
        backgroundColor: freshness.color, flexShrink: 0, opacity: isSeen ? 0.65 : 1,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "0.02em",
          }}>{alert.ticker}</span>
          <span style={{
            fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary,
            fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{alert.name}</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary, fontWeight: 500,
        }}>
          <span>{alertKindLabel(alert.kind)}</span>
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
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "-0.01em",
        }}>{fmtUsd(alert.price)}</div>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary,
          marginTop: 2, fontWeight: 600,
        }}>{alert.price_freshness_label || `score ${Math.round(alert.score)}`}</div>
      </div>
      <ChevronRight size={16} strokeWidth={2} color={T.inkTertiary} style={{ flexShrink: 0 }} />
      <button
        type="button"
        aria-label="Actions sur l'alerte"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu(alert.id);
        }}
        style={{
          border: "none", backgroundColor: "transparent", color: T.inkTertiary,
          width: 30, height: 30, borderRadius: 6, display: "inline-flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <MoreHorizontal size={17} />
      </button>
      {menuOpen && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: "absolute", right: 14, top: 46, zIndex: 30, minWidth: 180,
          backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
          borderRadius: 8, boxShadow: "0 12px 36px rgba(10,10,10,0.12)", padding: 6,
        }}>
          {alert.status === "NEW" && (
            <button type="button" onClick={() => onMarkSeen(alert.id)} style={{
              width: "100%", border: "none", backgroundColor: "transparent",
              color: T.inkSecondary, textAlign: "left", borderRadius: 6,
              padding: "9px 10px", fontFamily: FONT_SANS, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>Marquer comme vu</button>
          )}
          <button type="button" onClick={() => onDismissRequest(alert)} style={{
            width: "100%", border: "none", backgroundColor: "transparent",
            color: T.burgundy, textAlign: "left", borderRadius: 6,
            padding: "9px 10px", fontFamily: FONT_SANS, fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}>Ignorer</button>
        </div>
      )}
    </div>
  );
};

const TodayPage = ({ onAssetClick, onNavigate }) => {
  const supabase = useMemo(() => createClient(), []);
  const [alertFilters, setAlertFilters] = useState([]);
  const [alertSort, setAlertSort] = useState("freshness");
  const [alerts, setAlerts] = useState(ALERTS_TODAY);
  const [menuOpenForAlertId, setMenuOpenForAlertId] = useState(null);
  const [dismissModalForAlert, setDismissModalForAlert] = useState(null);
  const [actionError, setActionError] = useState(null);
  const visibleAlerts = useMemo(
    () => alerts.filter((a) => a.status !== "DISMISSED"),
    [alerts]
  );
  const { refreshing, handleRefresh } = useManualRefresh(async () => {});

  React.useEffect(() => {
    let cancelled = false;
    const loadLiveAlerts = async () => {
      try {
        const response = await fetch("/api/today/alerts?limit=50");
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
        if (cancelled || !Array.isArray(body?.alerts) || body.alerts.length === 0) return;
        setAlerts(body.alerts.map(normalizeTodayAlert));
      } catch {
        if (!cancelled) setAlerts(ALERTS_TODAY.map(normalizeTodayAlert));
      }
    };
    void loadLiveAlerts();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let next = [...visibleAlerts];
    if (alertFilters.includes("buy")) next = next.filter((a) => ["BUY_ZONE", "HOT_PULLBACK", "HOT_PULLBACK_ENTERED"].some((k) => a.kind?.includes(k)));
    if (alertFilters.includes("flash")) next = next.filter((a) => a.kind === "FLASH_DROP");
    if (alertFilters.includes("protective")) next = next.filter((a) => ["OVERBOUGHT", "DOWNTREND", "PROTECT"].some((k) => a.kind?.includes(k)));
    if (alertFilters.includes("held")) next = next.filter((a) => a.in_portfolio || a.isHeld);
    if (alertSort === "score") next.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    else if (alertSort === "kind") next.sort((a, b) => String(a.kind || "").localeCompare(String(b.kind || "")));
    else next.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return next;
  }, [alertFilters, alertSort, visibleAlerts]);

  const toggleAlertFilter = (key) => setAlertFilters((current) => (
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  ));
  const alertFilterDefs = [
    { key: "buy", label: "Buy zones", count: visibleAlerts.filter((a) => ["BUY_ZONE", "HOT_PULLBACK", "HOT_PULLBACK_ENTERED"].some((k) => a.kind?.includes(k))).length },
    { key: "flash", label: "Flash drops", count: visibleAlerts.filter((a) => a.kind === "FLASH_DROP").length },
    { key: "protective", label: "Protective", count: visibleAlerts.filter((a) => ["OVERBOUGHT", "DOWNTREND", "PROTECT"].some((k) => a.kind?.includes(k))).length },
    { key: "held", label: "Mes positions", count: visibleAlerts.filter((a) => a.in_portfolio || a.isHeld).length },
  ];
  const alertSortOptions = [
    { value: "freshness", label: "Fraicheur" },
    { value: "score", label: "Score DESC" },
    { value: "kind", label: "Type alerte" },
  ];

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
    <>
      <PageHeader
        eyebrow="Aujourd'hui"
        title={`${visibleAlerts.length} alertes`}
        subtitle="Signaux détectés sur les dernières 24 heures"
      />
      <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "flex-end" }}>
        <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
      </div>
      <DailyDecisionsSection onNavigate={onNavigate} onAssetClick={onAssetClick} />
      <FilterBar
        filters={alertFilterDefs}
        sortOptions={alertSortOptions}
        activeFilters={alertFilters}
        activeSort={alertSort}
        onChange={({ filter, sort }) => {
          if (sort) setAlertSort(sort);
          if (filter) toggleAlertFilter(filter);
        }}
      />
      {actionError && (
        <div style={{
          margin: "0 20px 12px", padding: "9px 11px", borderRadius: 8,
          backgroundColor: T.bgContre, color: T.burgundy,
          fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
        }}>{actionError}</div>
      )}
      <div style={{
        margin: "0 20px", backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
      }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Sparkles} title="Aucune alerte"
            message="Rien à signaler dans cette catégorie pour le moment." />
        ) : (
          filtered.map((a, i) => (
            <AlertRow
              key={a.id || i}
              alert={a}
              isLast={i === filtered.length - 1}
              menuOpen={menuOpenForAlertId === a.id}
              onToggleMenu={(alertId) => setMenuOpenForAlertId((current) => current === alertId ? null : alertId)}
              onMarkSeen={handleMarkSeen}
              onDismissRequest={(alert) => {
                setMenuOpenForAlertId(null);
                setDismissModalForAlert(alert);
              }}
              onClick={() => onAssetClick(a.ticker)}
            />
          ))
        )}
      </div>
      {dismissModalForAlert && (
        <DismissAlertModal
          alert={dismissModalForAlert}
          onClose={() => setDismissModalForAlert(null)}
          onConfirm={handleDismiss}
        />
      )}
      <div style={{ height: 32 }} />
    </>
  );
};

// ============================================================
// PAGE — ORDRES (paper + réels)
// ============================================================
const orderStatusKey = (status) => {
  const value = String(status || "").toUpperCase();
  if (["FILLED", "EXECUTED", "DONE"].includes(value)) return "filled";
  if (["EXPIRED", "CANCELLED", "CANCELED"].includes(value)) return "expired";
  return "pending";
};

const OrderRow = ({ order, onClick, isLast }) => {
  const distNeg = order.dist < 0;
  const statusLabel = order.status === "filled" ? "EXÉCUTÉ" : order.status === "expired" ? "EXPIRÉ" : "EN ATTENTE";
  const statusVariant = order.status === "filled" ? "success" : order.status === "expired" ? "warning" : "soft";
  return (
    <div onClick={onClick} style={{
      padding: "14px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      cursor: "pointer", transition: "background-color 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "0.02em",
        }}>{order.ticker}</span>
        <span style={{
          fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkTertiary,
        }}>Palier {order.palier}</span>
        <Badge variant={statusVariant} style={{ marginLeft: "auto" }}>{statusLabel}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 500,
          color: T.inkPrimary, letterSpacing: "-0.015em",
        }}>{order.currency === "EUR" ? `${fmtEur(order.limit)} €` : `$${fmtUsd(order.limit)}`}</span>
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 500 }}>
          × {order.qty}
        </span>
        <MetricChip variant={distNeg ? "negative" : "positive"} style={{ marginLeft: "auto" }}>
          {order.dist > 0 ? "+" : ""}{order.dist.toFixed(2)}%
        </MetricChip>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary, fontWeight: 500,
      }}>
        Cours actuel {order.currency === "EUR" ? `${fmtEur(order.current)} €` : `$${fmtUsd(order.current)}`} · expire le {new Date(order.expires).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </div>
    </div>
  );
};

const OrdersPage = ({ onAssetClick }) => {
  const [filterStatus, setFilterStatus] = useState("pending");
  const { orders, summary, loading, error } = useActiveOrders();

  // Adapter Supabase row -> OrderRow expected shape
  const adaptedOrders = useMemo(() => {
    return (orders || []).map((o) => ({
      ticker: o.ticker,
      palier: 1,
      status: orderStatusKey(o.status),
      limit: Number(o.effective_price ?? 0),
      qty: Number(o.effective_quantity ?? 0),
      dist: Number(o.price_change_since_proposal_pct ?? 0),
      current: Number(o.market_price_now ?? 0),
      expires: o.expires_at,
      currency: o.currency || "EUR",
    }));
  }, [orders]);

  const filteredOrders = useMemo(() => (
    adaptedOrders.filter((o) => o.status === filterStatus)
  ), [adaptedOrders, filterStatus]);

  const grouped = useMemo(() => {
    const g = {};
    filteredOrders.forEach((o) => {
      if (!g[o.ticker]) g[o.ticker] = [];
      g[o.ticker].push(o);
    });
    return g;
  }, [filteredOrders]);

  const totalPending = summary?.pending ?? adaptedOrders.filter((o) => o.status === "pending").length;
  const totalFilled = summary?.filled ?? adaptedOrders.filter((o) => o.status === "filled").length;
  const totalExpired = summary?.expired ?? adaptedOrders.filter((o) => o.status === "expired").length;
  const tickerCount = Object.keys(grouped).length;

  return (
    <>
      <PageHeader
        eyebrow="Ordres"
        title={loading ? "Chargement…" : `${filteredOrders.length} ${filterStatus === "pending" ? `plan${filteredOrders.length > 1 ? "s" : ""} d'entrée à confirmer` : filterStatus === "filled" ? "exécutés" : "expirés"}`}
        subtitle="Paper trading et ordres réels"
      />
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={filterStatus === "pending"} onClick={() => setFilterStatus("pending")} count={totalPending}>
          À confirmer
        </FilterChip>
        <FilterChip active={filterStatus === "filled"} onClick={() => setFilterStatus("filled")} count={totalFilled}>
          Exécutés
        </FilterChip>
        <FilterChip active={filterStatus === "expired"} onClick={() => setFilterStatus("expired")} count={totalExpired}>
          Expirés
        </FilterChip>
      </div>
      {error && (
        <div style={{ padding: "12px 20px", color: T.burgundy, fontFamily: FONT_SANS, fontSize: 13 }}>
          Erreur de chargement — réessai automatique dans 30s.
        </div>
      )}
      {!loading && !error && tickerCount === 0 && (
        <div style={{ padding: "32px 20px", textAlign: "center", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
          {filterStatus === "pending" ? "Aucun plan d'entrée à confirmer." : `Aucun ordre ${filterStatus === "filled" ? "exécuté" : "expiré"}.`}
        </div>
      )}
      {Object.entries(grouped).map(([ticker, ordersForTicker]) => (
        <section key={ticker} style={{ marginBottom: 16, padding: "0 20px" }}>
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            marginBottom: 8, padding: "0 4px",
          }}>
            <div onClick={() => onAssetClick(ticker)} style={{ cursor: "pointer", flex: 1 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700,
                color: T.inkPrimary, letterSpacing: "0.02em",
              }}>{ticker}</span>
              <span style={{
                fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary,
                fontWeight: 500, marginLeft: 8,
              }}>{ordersForTicker.length} palier{ordersForTicker.length > 1 ? "s" : ""} · paper</span>
            </div>
            <ChevronRight size={14} strokeWidth={2} color={T.inkTertiary} />
          </div>
          <div style={{
            backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
            borderRadius: 10, overflow: "hidden",
          }}>
            {ordersForTicker.map((o, i) => (
              <OrderRow key={i} order={o} isLast={i === ordersForTicker.length - 1}
                onClick={() => onAssetClick(o.ticker)} />
            ))}
          </div>
        </section>
      ))}
      <div style={{ height: 24 }} />
    </>
  );
};

// ============================================================
// PAGE — PORTEFEUILLE (positions)
// ============================================================
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

const positionDayPerf = (position) => {
  const n = Number(position.perf_1d_pct ?? position.day_perf_pct ?? position.change_1d_pct ?? position.price_change_pct);
  return Number.isFinite(n) ? n : null;
};

const PortfolioPerfSummary = ({ positions }) => {
  const totalPositions = positions.length;
  const totalValue = positions.reduce((sum, p) => sum + Number(p.market_value_native || 0), 0);
  const weightedPnl = positions.reduce((sum, p) => {
    const weight = totalValue > 0 ? Number(p.market_value_native || 0) / totalValue : 0;
    return sum + weight * Number(p.unrealized_pnl_pct || 0);
  }, 0);
  const winners = positions.filter((p) => Number(p.unrealized_pnl_pct || 0) >= 0).length;
  const losers = positions.filter((p) => Number(p.unrealized_pnl_pct || 0) < 0).length;
  const positive = weightedPnl >= 0;

  return (
    <div style={{
      margin: "0 20px 14px", padding: "13px 14px",
      backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
      borderRadius: 12, display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12,
    }}>
      <div>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
          color: T.inkTertiary, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>{totalPositions} positions</div>
        <div style={{
          marginTop: 3, fontFamily: FONT_SANS, fontSize: 12,
          color: T.inkSecondary, fontWeight: 600,
        }}>{winners} gagnantes / {losers} perdantes</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500,
          color: positive ? T.forestGreen : T.burgundy, letterSpacing: "-0.015em",
        }}>{positive ? "+" : ""}{weightedPnl.toFixed(2)}%</div>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>P&L pondere</div>
      </div>
    </div>
  );
};

const PositionStat = ({ label, value }) => (
  <div>
    <div style={{
      fontFamily: FONT_SANS, fontSize: 9.5, color: T.inkTertiary,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    }}>{label}</div>
    <div style={{
      marginTop: 2, fontFamily: FONT_MONO, fontSize: 10.5,
      color: T.inkSecondary, fontWeight: 700,
    }}>{value}</div>
  </div>
);

const PositionActions = ({ position, onPrepareOrder }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
    {[
      { side: "buy", label: "Renforcer +", tone: T.forestGreen },
      { side: "sell", label: "Alleger -", tone: T.burgundy },
    ].map((action) => (
      <button
        key={action.side}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPrepareOrder(position, action.side);
        }}
        style={{
          border: `1px solid ${action.tone}`,
          backgroundColor: action.side === "buy" ? T.bgPour : T.bgContre,
          color: action.tone,
          borderRadius: 8,
          padding: "8px 7px",
          fontFamily: FONT_SANS,
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {action.label}
      </button>
    ))}
  </div>
);

const PositionRow = ({ position, onClick, isLast, viewMode, onPrepareOrder }) => {
  const pnlPct = Number(position.unrealized_pnl_pct ?? position.pnlPct ?? 0);
  const positive = pnlPct >= 0;
  const pnlColor = positive ? T.forestGreen : T.burgundy;
  const currency = position.asset_currency || "EUR";
  const quantity = Number(position.total_quantity ?? position.qty ?? 0);
  const avgCost = position.avg_cost_per_unit;
  const lastPrice = position.current_price ?? position.last_price ?? position.price;
  const marketValue = position.market_value_native ?? position.value;
  const pnlNative = position.unrealized_pnl_native ?? position.pnlNative ?? position.pnlEur;
  const pnlEur = position.unrealized_pnl_eur;
  const dayPerf = positionDayPerf(position);
  const name = position.asset_name || position.name;
  const account = position.account_name || position.account;
  const stats = [
    ["Qty", formatPositionNumber(quantity, 4)],
    ["PRU", formatPositionMoney(avgCost, currency)],
    ["Prix", formatPositionMoney(lastPrice, currency)],
    ["Valeur", formatPositionMoney(marketValue, currency, 0)],
  ];
  if (viewMode === "list") {
    return (
      <div onClick={onClick} style={{
        padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
        display: "grid", gridTemplateColumns: "1fr auto", gap: 12, cursor: "pointer",
        transition: "background-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>
              {position.ticker}
            </span>
            <span style={{
              fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary, fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{name}</span>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary, marginTop: 2,
            fontWeight: 600, letterSpacing: "0.05em",
          }}>{account}</div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            marginTop: 8, fontFamily: FONT_MONO, fontSize: 11.5,
            color: T.inkSecondary, fontWeight: 600,
          }}>
            <span>Qty {formatPositionNumber(quantity, 4)}</span>
            <span>PRU {formatPositionMoney(avgCost, currency)}</span>
            <span>Prix {formatPositionMoney(lastPrice, currency)}</span>
            <span>Val. {formatPositionMoney(marketValue, currency, 0)}</span>
            <span>P&L EUR {formatPositionMoney(pnlEur, "EUR", 0)}</span>
            <span>Jour {dayPerf == null ? "-" : `${dayPerf >= 0 ? "+" : ""}${dayPerf.toFixed(2)}%`}</span>
          </div>
          <PositionActions position={position} onPrepareOrder={onPrepareOrder} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 500,
            color: T.inkPrimary, letterSpacing: "-0.01em",
          }}>{formatPositionMoney(marketValue, currency, 0)}</div>
          <MetricChip variant={positive ? "positive" : "negative"} style={{ marginTop: 3, fontSize: 11.5 }}>
            {positive ? "+" : ""}{pnlPct.toFixed(2)}%
          </MetricChip>
          <div style={{
            marginTop: 4, fontFamily: FONT_MONO, fontSize: 11.5,
            color: pnlColor, fontWeight: 700,
          }}>{positive ? "+" : ""}{formatPositionMoney(pnlNative, currency, 0)}</div>
        </div>
      </div>
    );
  }
  // viewMode === "card"
  return (
    <div onClick={onClick} style={{
      padding: 14, backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
      borderRadius: 10, cursor: "pointer", transition: "background-color 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.bgSurface}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>
          {position.ticker}
        </span>
        <Badge variant="soft" style={{ fontSize: 8.5 }}>{account}</Badge>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 500,
        marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{name}</div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10,
        fontFamily: FONT_MONO, fontSize: 11.5, color: T.inkSecondary, fontWeight: 600,
      }}>
        {stats.map(([label, value]) => (
          <span key={label}>{label} {value}</span>
        ))}
        <span>P&L EUR {formatPositionMoney(pnlEur, "EUR", 0)}</span>
        <span>Jour {dayPerf == null ? "-" : `${dayPerf >= 0 ? "+" : ""}${dayPerf.toFixed(2)}%`}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500,
          color: T.inkPrimary, letterSpacing: "-0.01em" }}>
          {formatPositionMoney(marketValue, currency, 0)}
        </div>
        <MetricChip variant={positive ? "positive" : "negative"} style={{ fontSize: 12 }}>
          {positive ? "+" : ""}{pnlPct.toFixed(2)}%
        </MetricChip>
      </div>
      <div style={{
        marginTop: 5, fontFamily: FONT_MONO, fontSize: 12,
        color: pnlColor, fontWeight: 700,
      }}>{positive ? "+" : ""}{formatPositionMoney(pnlNative, currency, 0)}</div>
      <PositionActions position={position} onPrepareOrder={onPrepareOrder} />
    </div>
  );
};

const SUPPORTED_POSITION_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "HKD"];
const POSITION_DUPLICATE_WINDOW_MS = 5000;
let lastPositionSubmit = { payload: null, at: 0 };
const nowForDatetimeInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const buildPositionSubmitPayload = ({
  kind,
  accountId,
  selectedAsset,
  quantity,
  unitPrice,
  currency,
  executedAt,
  fees,
  notes,
}) => JSON.stringify({
  kind,
  accountId,
  assetId: selectedAsset?.asset_id || selectedAsset?.id || null,
  ticker: selectedAsset?.ticker || null,
  exchange: selectedAsset?.exchange_mic || null,
  quantity: Number(quantity),
  unitPrice: Number(unitPrice),
  currency,
  executedAt: new Date(executedAt).toISOString(),
  fees: Number(fees) || 0,
  notes: notes.trim() || null,
});

const AssetSearchInput = ({ onSelect, onQueryChange, placeholder = "Rechercher un asset...", initialValue = "" }) => {
  const { query, setQuery, results, loading, error } = useAssetSearch({ debounceMs: 250 });
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
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
          fontFamily: FONT_SANS, fontSize: 14, color: T.inkPrimary,
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
          marginTop: 4, maxHeight: 300, overflowY: "auto",
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
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

const AddPositionAccordion = ({ open, onClose, onSuccess, initialDraft = null }) => {
  const supabase = useMemo(() => createClient(), []);
  const { patrimoine } = useTodayDashboard({ pollMs: 60000, limit: 1 });
  const { query, results, loading, error: searchError, createUserAsset } = useAssetSearch({ debounceMs: 250 });
  const accounts = useMemo(
    () => (patrimoine?.accounts || []).filter((a) => a.is_active && a.universe !== "PAPER_TRADING"),
    [patrimoine]
  );
  const [kind, setKind] = useState(initialDraft?.side || "buy");
  const [accountId, setAccountId] = useState(initialDraft?.accountId || "");
  const [selectedAsset, setSelectedAsset] = useState(initialDraft?.asset || null);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState(initialDraft?.unitPrice ? String(initialDraft.unitPrice) : "");
  const [currency, setCurrency] = useState(initialDraft?.currency || "EUR");
  const [executedAt, setExecutedAt] = useState(nowForDatetimeInput);
  const [fees, setFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const pendingPayloadRef = React.useRef(null);

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
  const submitLabel = kind === "sell" ? "Enregistrer la vente" : "Ajouter la position";

  const selectAsset = (asset) => {
    setSelectedAsset(asset);
    setCurrency(asset.currency || "EUR");
    setErrors((prev) => ({ ...prev, asset: null }));
  };

  const handleSubmit = async () => {
    if (submitting || pendingPayloadRef.current) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildPositionSubmitPayload({
      kind,
      accountId: selectedAccount.account_id,
      selectedAsset,
      quantity,
      unitPrice,
      currency,
      executedAt,
      fees,
      notes,
    });
    const now = Date.now();
    if (lastPositionSubmit.payload === payload && now - lastPositionSubmit.at < POSITION_DUPLICATE_WINDOW_MS) {
      const message = "Action deja envoyee. Attendez quelques secondes avant de recommencer.";
      setErrors({ submit: message });
      toast.warning(message);
      return;
    }

    pendingPayloadRef.current = payload;
    lastPositionSubmit = { payload, at: now };
    setSubmitting(true);
    setSuccess(null);
    try {
      let assetId = selectedAsset.asset_id || selectedAsset.id;
      if (!assetId && selectedAsset.isExternal) {
        assetId = await createUserAsset(selectedAsset);
      }
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
      const successMessage = kind === "sell"
        ? `Vente ${result?.ticker || selectedAsset.ticker} enregistree sur ${result?.account_name || selectedAccount.account_name}`
        : `Position ${result?.ticker || selectedAsset.ticker} ajoutee sur ${result?.account_name || selectedAccount.account_name}`;
      setSuccess(successMessage);
      toast.success(successMessage);
      if (typeof onSuccess === "function") await onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setErrors({ submit: e.message || "Erreur inattendue" });
    } finally {
      pendingPayloadRef.current = null;
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
    fontFamily: FONT_SANS, fontSize: 14, color: T.inkPrimary,
    backgroundColor: T.bgCanvas, outline: "none",
  };
  const labelStyle = {
    display: "block", fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: T.inkTertiary, marginBottom: 6,
  };
  const errorText = (key) => (errors[key] ? (
    <div style={{ marginTop: 5, fontFamily: FONT_SANS, fontSize: 11.5, color: T.burgundy, fontWeight: 600 }}>{errors[key]}</div>
  ) : null);

  return (
    <div style={{
      margin: "0 20px 16px", padding: 16,
      backgroundColor: T.bgSurface, border: `1.5px solid ${T.forestGreen}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Eyebrow variant="accent">Ajouter une position</Eyebrow>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.inkTertiary }}>
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { value: "buy", label: "Buy", icon: TrendingUp },
          { value: "sell", label: "Sell", icon: TrendingDown },
        ].map((opt) => {
          const Icon = opt.icon;
          const active = kind === opt.value;
          return (
            <button key={opt.value} onClick={() => setKind(opt.value)} style={{
              padding: "10px 8px", border: `1.5px solid ${active ? T.forestGreen : T.borderSubtle}`,
              backgroundColor: active ? T.bgPour : T.bgCanvas,
              borderRadius: 8, cursor: "pointer", fontFamily: FONT_SANS,
              fontSize: 13, fontWeight: 700, color: active ? T.forestGreen : T.inkPrimary,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Icon size={14} strokeWidth={2.2} />{opt.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Compte</label>
        <select value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)} style={fieldStyle}>
          <option value="">Choisir un compte</option>
          {accounts.map((a) => (
            <option key={a.account_id} value={a.account_id}>{a.account_name}{a.broker ? ` - ${a.broker}` : ""}</option>
          ))}
        </select>
        {errorText("account")}
      </div>

      <div style={{ marginBottom: 12 }}>
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
          <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto" }}>
            {results.internal.map((r) => (
              <SearchResultRow key={r.asset_id} ticker={r.ticker} name={r.asset_name}
                meta={[r.exchange_mic, r.currency].filter(Boolean).join(" Â· ")}
                isPremium={r.coverage_level === "NEXIAL_CORE"} onAdd={() => selectAsset(r)} />
            ))}
            {results.external.map((r) => {
              const key = `ext:${r.ticker}:${r.exchange_mic}`;
              return (
                <SearchResultRow key={key} ticker={r.ticker} name={r.asset_name}
                  meta={[r.exchange_mic, r.currency, r.country].filter(Boolean).join(" Â· ")}
                  isTracked onAdd={() => selectAsset({ ...r, isExternal: true })} />
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Contexte de l'achat, thÃ¨se..." style={{ ...fieldStyle, resize: "vertical" }} />
      </div>
      {errors.submit && <div style={{ marginTop: 10, fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy, fontWeight: 600 }}>{errors.submit}</div>}
      {success && <div style={{ marginTop: 10, fontFamily: FONT_SANS, fontSize: 12, color: T.forestGreen, fontWeight: 700 }}>{success}</div>}
      <button onClick={handleSubmit} disabled={submitDisabled} style={{
        marginTop: 14, width: "100%", padding: 12,
        backgroundColor: T.inkPrimary, color: T.inkOnDark, border: "none",
        borderRadius: 10, fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 700,
        cursor: submitDisabled ? "default" : "pointer", opacity: submitDisabled ? 0.55 : 1,
      }}>
        {submitting ? "Enregistrement..." : submitLabel}
      </button>
    </div>
  );
};

const PortfolioPage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [accountFilterId, setAccountFilterId] = useState(null);
  const [portfolioFilters, setPortfolioFilters] = useState([]);
  const [portfolioSort, setPortfolioSort] = useState("value_desc");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [orderDraft, setOrderDraft] = useState(null);
  const { positions, summary, loading, error, refetch } = usePortfolio({ accountFilter: accountFilterId });
  const { refreshing, handleRefresh } = useManualRefresh(refetch);

  const adaptedPositions = useMemo(() => {
    let next = [...(positions || [])].map((p) => ({
      ...p,
      name: p.asset_name,
      account: p.account_name,
      value: Number(p.market_value_native ?? 0),
      pnlPct: Number(p.unrealized_pnl_pct ?? 0),
      pnlNative: Number(p.unrealized_pnl_native ?? 0),
      price: Number(p.current_price ?? p.last_price ?? 0),
    }));
    if (portfolioFilters.includes("eur")) next = next.filter((p) => (p.asset_currency || "").toUpperCase() === "EUR");
    if (portfolioFilters.includes("usd")) next = next.filter((p) => (p.asset_currency || "").toUpperCase() === "USD");
    if (portfolioSort === "pnl_desc") next.sort((a, b) => Number(b.unrealized_pnl_pct ?? 0) - Number(a.unrealized_pnl_pct ?? 0));
    else if (portfolioSort === "pnl_asc") next.sort((a, b) => Number(a.unrealized_pnl_pct ?? 0) - Number(b.unrealized_pnl_pct ?? 0));
    else if (portfolioSort === "ticker_asc") next.sort((a, b) => String(a.ticker || "").localeCompare(String(b.ticker || "")));
    else next.sort((a, b) => Number(b.market_value_native ?? b.market_value_eur ?? 0) - Number(a.market_value_native ?? a.market_value_eur ?? 0));
    return next;
  }, [positions, portfolioFilters, portfolioSort]);

  const totalValue = adaptedPositions.reduce((sum, p) => sum + Number(p.market_value_eur ?? 0), 0);
  const accountsForChips = summary?.by_account ?? [];
  const filterLabel = accountFilterId
    ? (accountsForChips.find((a) => a.account_id === accountFilterId)?.account_name || "")
    : "";

  const togglePortfolioFilter = (key) => setPortfolioFilters((current) => (
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  ));
  const portfolioFilterDefs = [
    { key: "eur", label: "Devise EUR", count: (positions || []).filter((p) => (p.asset_currency || "").toUpperCase() === "EUR").length },
    { key: "usd", label: "Devise USD", count: (positions || []).filter((p) => (p.asset_currency || "").toUpperCase() === "USD").length },
  ];
  const portfolioSortOptions = [
    { value: "value_desc", label: "Valeur DESC" },
    { value: "pnl_desc", label: "P&L % DESC" },
    { value: "pnl_asc", label: "P&L % ASC" },
    { value: "ticker_asc", label: "Ticker A-Z" },
  ];
  const openPositionOrder = (position = null, side = "buy") => {
    setOrderDraft(position ? {
      side,
      accountId: position.account_id,
      currency: position.asset_currency || position.currency || "EUR",
      unitPrice: position.current_price ?? position.last_price ?? position.price,
      asset: {
        asset_id: position.asset_id,
        id: position.asset_id,
        ticker: position.ticker,
        asset_name: position.asset_name || position.name,
        currency: position.asset_currency || position.currency || "EUR",
        exchange_mic: position.exchange_mic,
      },
    } : null);
    setShowAddPosition(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Portefeuille"
        title={loading ? "Chargement…" : `€${fmtEur(totalValue)}`}
        subtitle={`${adaptedPositions.length} position${adaptedPositions.length > 1 ? "s" : ""}${filterLabel ? ` · ${filterLabel}` : ""}`}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
            <button
              onClick={() => openPositionOrder()}
              style={{
                padding: "8px 14px", backgroundColor: T.inkPrimary, color: T.inkOnDark,
                border: "none", borderRadius: 8, fontFamily: FONT_SANS,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <Plus size={14} strokeWidth={2.2} />Ajouter
            </button>
            <SegmentedControl
              options={[
                { value: "list", label: "", icon: <List size={14} strokeWidth={2} /> },
                { value: "card", label: "", icon: <LayoutGrid size={14} strokeWidth={2} /> },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        }
      />
      <AddPositionAccordion
        key={orderDraft ? `${orderDraft.side}:${orderDraft.asset?.ticker || "asset"}` : "manual-position"}
        open={showAddPosition}
        initialDraft={orderDraft}
        onClose={() => {
          setShowAddPosition(false);
          setOrderDraft(null);
        }}
        onSuccess={refetch}
      />
      <FilterBar
        filters={portfolioFilterDefs}
        sortOptions={portfolioSortOptions}
        activeFilters={portfolioFilters}
        activeSort={portfolioSort}
        onChange={({ filter, sort }) => {
          if (sort) setPortfolioSort(sort);
          if (filter) togglePortfolioFilter(filter);
        }}
      />
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={accountFilterId === null} onClick={() => setAccountFilterId(null)}>
          Tous
        </FilterChip>
        {accountsForChips.map((a) => (
          <FilterChip
            key={a.account_id}
            active={accountFilterId === a.account_id}
            onClick={() => setAccountFilterId(a.account_id)}
            count={a.positions_count}>
            {a.account_name}
          </FilterChip>
        ))}
      </div>
      {error && (
        <div style={{ padding: "12px 20px", color: T.burgundy, fontFamily: FONT_SANS, fontSize: 13 }}>
          Erreur de chargement — réessai automatique dans 60s.
        </div>
      )}
      {!loading && !error && adaptedPositions.length > 0 && (
        <PortfolioPerfSummary positions={adaptedPositions} />
      )}
      {!loading && !error && adaptedPositions.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: T.inkTertiary, fontFamily: FONT_SANS, fontSize: 13 }}>
          Aucune position{filterLabel ? ` sur ${filterLabel}` : ""}.
        </div>
      ) : viewMode === "list" ? (
        <div style={{
          margin: "0 20px", backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
        }}>
          {adaptedPositions.map((p, i) => (
            <PositionRow key={p.ticker + ":" + p.account_id} position={p} viewMode="list"
              isLast={i === adaptedPositions.length - 1}
              onClick={() => onAssetClick(p.ticker)}
              onPrepareOrder={openPositionOrder} />
          ))}
        </div>
      ) : (
        <div style={{
          margin: "0 20px", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {adaptedPositions.map((p) => (
            <PositionRow key={p.ticker + ":" + p.account_id} position={p} viewMode="card"
              onClick={() => onAssetClick(p.ticker)}
              onPrepareOrder={openPositionOrder} />
          ))}
        </div>
      )}
      <div style={{ height: 32 }} />
    </>
  );
};

// ============================================================
// PAGE — WATCHLIST
// ============================================================
const WatchlistRow = ({ item, onClick, isLast, viewMode, onRemoveRequest, canRemove = true }) => {
  const variant = stateVariant(item.state);

  if (viewMode === "card") {
    return (
      <div onClick={onClick} style={{
        position: "relative",
        padding: 14, backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 10,
        cursor: "pointer", transition: "background-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.bgSurface}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>
            {item.ticker}
          </span>
          {item.isHeld && (
            <span style={{
              fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em", color: T.forestGreen, textTransform: "uppercase",
            }}>Détenu</span>
          )}
        </div>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 500,
          marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          paddingRight: canRemove ? 28 : 0,
        }}>{item.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <MetricChip variant={variant} style={{ fontSize: 10.5 }}>
            {stateLabel(item.state)}
          </MetricChip>
          {item.quality === "ULTRA_PREMIUM" && (
            <span style={{
              fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em", color: T.gold, textTransform: "uppercase",
              padding: "2px 5px", border: `1px solid ${T.gold}`, borderRadius: 3,
            }}>★ Ultra</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: T.inkPrimary,
          }}>{item.price >= 1000 ? `€${fmtEur(item.price)}` : `€${item.price.toFixed(2)}`}</span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500,
            color: T.inkPrimary, letterSpacing: "-0.01em",
          }}>{Math.round(item.score)}</span>
        </div>
        {canRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRequest(item);
            }}
            aria-label="Plus d'actions"
            style={{
              position: "absolute", top: 8, right: 8,
              padding: 6, background: "transparent", border: "none",
              cursor: "pointer", color: T.inkTertiary, borderRadius: 6,
            }}>
            <MoreHorizontal size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  }
  // list view
  return (
    <div onClick={onClick} style={{
      padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      transition: "background-color 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>
            {item.ticker}
          </span>
          <span style={{
            fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary, fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{item.name}</span>
          {item.isHeld && (
            <span style={{
              fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
              letterSpacing: "0.1em", color: T.forestGreen, flexShrink: 0,
            }}>·DÉTENU</span>
          )}
        </div>
        <MetricChip variant={variant} style={{ fontSize: 10 }}>
          {stateLabel(item.state)}
        </MetricChip>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500,
          color: T.inkPrimary, letterSpacing: "-0.01em" }}>
          {Math.round(item.score)}
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 9, color: T.inkTertiary,
          fontWeight: 600, letterSpacing: "0.08em", marginTop: 1,
        }}>SCORE</div>
      </div>
      {canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveRequest(item);
          }}
          aria-label="Plus d'actions"
          style={{
            padding: 8, background: "transparent", border: "none",
            cursor: "pointer", color: T.inkTertiary, borderRadius: 6,
            flexShrink: 0,
          }}>
          <MoreHorizontal size={17} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
};

const liveWatchlistPrice = (item) => Number(item.last_price ?? item.current_price ?? item.price ?? 0);
const liveWatchlistCurrency = (item) => item.asset_currency || item.currency || "EUR";
const liveWatchlistPerf1d = (item) => Number(item.chg_24h_pct ?? item.perf_1d_pct ?? item.unrealized_pnl_pct ?? 0);
const liveWatchlistScore = (item) => Number(item.opportunity_score ?? item.score ?? 0);
const LIVE_WATCHLIST_NOW = Date.now();
const liveWatchlistNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};
const liveWatchlistAbsChange = (item) => {
  const direct = liveWatchlistNumber(
    item.price_change_abs,
    item.change_abs,
    item.chg_24h_abs,
    item.change_1d_abs,
    item.perf_1d_abs,
    item.day_change_abs,
    item.absolute_change,
    item.price_delta,
  );
  if (direct !== null) return direct;
  const price = liveWatchlistPrice(item);
  const pct = liveWatchlistNumber(item.chg_24h_pct, item.perf_1d_pct, item.unrealized_pnl_pct);
  if (!(price > 0) || pct === null || pct <= -100) return null;
  return price - (price / (1 + pct / 100));
};
const liveWatchlistAbsText = (item) => {
  const change = liveWatchlistAbsChange(item);
  if (change === null) return null;
  return `${change >= 0 ? "+" : ""}${change.toFixed(Math.abs(change) >= 100 ? 2 : 3)} ${liveWatchlistCurrency(item)}`;
};
const liveWatchlistStaleTag = (item) => {
  const stamp = item.price_updated_at || item.price_as_of || item.priced_at || item.last_price_at || item.last_quote_at || item.updated_at;
  if (stamp) {
    const time = new Date(stamp).getTime();
    if (Number.isFinite(time)) {
      const days = Math.floor((LIVE_WATCHLIST_NOW - time) / 86400000);
      if (days >= 3) return `J-${days}`;
    }
  }
  const status = String(item.freshness_status || "").toLowerCase();
  if (status.includes("stale") || status === "red") return "STALE";
  return null;
};
const liveWatchlistZ1 = (item) => Number(item.z1_price ?? item.z1 ?? 0);
const liveWatchlistZDistance = (item) => {
  if (item.distance_to_z1_pct !== undefined && item.distance_to_z1_pct !== null) return Number(item.distance_to_z1_pct);
  const price = liveWatchlistPrice(item);
  const z1 = liveWatchlistZ1(item);
  if (!(price > 0) || !(z1 > 0)) return null;
  return ((price - z1) / price) * 100;
};
const liveWatchlistInBuyZone = (item) => {
  const price = liveWatchlistPrice(item);
  const z1 = liveWatchlistZ1(item);
  return item.has_buy_alert === true || item.signal === "BUY_ZONE" || (price > 0 && z1 > 0 && price <= z1);
};
const liveWatchlistRsiTag = (item) => {
  const rsi = Number(item.rsi_14);
  if (!Number.isFinite(rsi) || rsi <= 0) return null;
  if (rsi > 70) return { label: "Surchauffe", color: T.amber, bg: T.bgAlert };
  if (rsi < 30) return { label: "Survendu", color: T.forestGreen, bg: T.bgPour };
  return { label: "OK", color: T.inkTertiary, bg: T.bgSurface };
};
const LiveWatchlistTag = ({ children, color = T.inkSecondary, bg = T.bgSurface }) => (
  <span style={{
    padding: "2px 6px", borderRadius: 5, backgroundColor: bg, color,
    border: `1px solid ${color}30`, fontFamily: FONT_SANS, fontSize: 9,
    fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
  }}>{children}</span>
);

const WatchlistItemRow = ({ item, onClick, isLast, viewMode, onRemoveRequest, canRemove = true }) => {
  const variant = stateVariant(item.state);
  const price = liveWatchlistPrice(item);
  const perf1d = liveWatchlistPerf1d(item);
  const perfColor = perf1d >= 0 ? T.forestGreen : T.burgundy;
  const absText = liveWatchlistAbsText(item);
  const staleTag = liveWatchlistStaleTag(item);
  const score = liveWatchlistScore(item);
  const zDistance = liveWatchlistZDistance(item);
  const inBuyZone = liveWatchlistInBuyZone(item);
  const rsiTag = liveWatchlistRsiTag(item);
  const bg = inBuyZone ? T.bgPour : T.bgSurface;
  const priceText = price > 0 ? `${price.toFixed(price >= 100 ? 2 : 3)} ${liveWatchlistCurrency(item)}` : "-";
  const scoreColor = score >= 70 ? T.forestGreen : score >= 50 ? T.gold : T.inkPrimary;

  if (viewMode === "card") {
    return (
      <div onClick={onClick} style={{
        position: "relative", padding: 14, backgroundColor: bg,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 10,
        cursor: "pointer", transition: "background-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bg}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>{item.ticker}</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: scoreColor }}>{score > 0 ? Math.round(score) : "-"}</span>
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: canRemove ? 28 : 0 }}>
          {item.name || item.asset_name || item.ticker}
        </div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          <MetricChip variant={variant} style={{ fontSize: 10 }}>{stateLabel(item.state)}</MetricChip>
          {inBuyZone && <LiveWatchlistTag color={T.forestGreen} bg={T.bgPour}>BUY ZONE</LiveWatchlistTag>}
          {rsiTag && <LiveWatchlistTag color={rsiTag.color} bg={rsiTag.bg}>{rsiTag.label}</LiveWatchlistTag>}
          {item.isHeld && <LiveWatchlistTag color={T.forestGreen} bg={T.bgPour}>Detenu</LiveWatchlistTag>}
          {staleTag && <LiveWatchlistTag color={T.amber} bg={T.bgAlert}>{staleTag}</LiveWatchlistTag>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: T.inkPrimary, fontWeight: 800 }}>{priceText}</div>
            {price > 0 && <div style={{ marginTop: 3, fontFamily: FONT_MONO, fontSize: 10.5, color: perfColor, fontWeight: 800 }}>{perf1d >= 0 ? "+" : ""}{perf1d.toFixed(2)}%{absText ? ` / ${absText}` : ""} 24h</div>}
          </div>
          <div style={{ textAlign: "right", fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary, fontWeight: 800 }}>
            {zDistance == null ? "Z1 -" : `Z1 ${zDistance >= 0 ? "+" : ""}${zDistance.toFixed(1)}%`}
          </div>
        </div>
        {canRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemoveRequest(item); }} aria-label="Plus d'actions" style={{ position: "absolute", top: 8, right: 8, padding: 6, background: "transparent", border: "none", cursor: "pointer", color: T.inkTertiary, borderRadius: 6 }}>
            <MoreHorizontal size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div onClick={onClick} style={{
      padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      display: "grid", gridTemplateColumns: canRemove ? "1fr auto auto auto" : "1fr auto auto", gap: 10,
      alignItems: "center", cursor: "pointer", backgroundColor: bg,
      transition: "background-color 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bg}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: T.inkPrimary }}>{item.ticker}</span>
          <span style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name || item.asset_name}</span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <MetricChip variant={variant} style={{ fontSize: 10 }}>{stateLabel(item.state)}</MetricChip>
          {inBuyZone && <LiveWatchlistTag color={T.forestGreen} bg={T.bgPour}>BUY ZONE</LiveWatchlistTag>}
          {rsiTag && <LiveWatchlistTag color={rsiTag.color} bg={rsiTag.bg}>{rsiTag.label}</LiveWatchlistTag>}
          {item.isHeld && <LiveWatchlistTag color={T.forestGreen} bg={T.bgPour}>Detenu</LiveWatchlistTag>}
          {staleTag && <LiveWatchlistTag color={T.amber} bg={T.bgAlert}>{staleTag}</LiveWatchlistTag>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.inkPrimary, fontWeight: 800 }}>{priceText}</div>
        {price > 0 && <div style={{ marginTop: 3, fontFamily: FONT_MONO, fontSize: 10.5, color: perfColor, fontWeight: 800 }}>{perf1d >= 0 ? "+" : ""}{perf1d.toFixed(2)}%</div>}
        {absText && <div style={{ marginTop: 2, fontFamily: FONT_MONO, fontSize: 10, color: perfColor, fontWeight: 700 }}>{absText}</div>}
        <div style={{ marginTop: 3, fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary, fontWeight: 800 }}>{zDistance == null ? "Z1 -" : `Z1 ${zDistance >= 0 ? "+" : ""}${zDistance.toFixed(1)}%`}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500, color: scoreColor }}>{score > 0 ? Math.round(score) : "-"}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 9, color: T.inkTertiary, fontWeight: 600, letterSpacing: "0.08em" }}>SCORE</div>
      </div>
      {canRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemoveRequest(item); }} aria-label="Plus d'actions" style={{ padding: 8, background: "transparent", border: "none", cursor: "pointer", color: T.inkTertiary, borderRadius: 6 }}>
          <MoreHorizontal size={17} strokeWidth={2.2} />
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
      position: "fixed", inset: 0, zIndex: 70,
      backgroundColor: "rgba(10,10,10,0.32)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 12, padding: 18,
        boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
      }}>
        <Eyebrow variant="accent">Retirer de la watchlist</Eyebrow>
        <h3 style={{
          margin: "10px 0 6px", fontFamily: FONT_DISPLAY,
          fontSize: 22, fontWeight: 500, color: T.inkPrimary,
          letterSpacing: "-0.015em",
        }}>Retirer {item.ticker} ?</h3>
        <p style={{
          margin: 0, fontFamily: FONT_SANS, fontSize: 13,
          lineHeight: 1.5, color: T.inkSecondary,
        }}>
          {item.name || item.asset_name || item.ticker} sera retirÃ© de la watchlist. Tu pourras le rÃ©ajouter plus tard.
        </p>
        {error && (
          <div style={{ marginTop: 12, fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy, fontWeight: 600 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} disabled={removing} style={{
            padding: "9px 13px", backgroundColor: T.bgSurface,
            color: T.inkSecondary, border: `1px solid ${T.borderSubtle}`,
            borderRadius: 8, cursor: removing ? "default" : "pointer",
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
          }}>Annuler</button>
          <button onClick={handleConfirm} disabled={removing} style={{
            padding: "9px 13px", backgroundColor: T.burgundy,
            color: T.inkOnDark, border: "none", borderRadius: 8,
            cursor: removing ? "default" : "pointer",
            opacity: removing ? 0.65 : 1,
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700,
          }}>{removing ? "Suppression..." : "Retirer"}</button>
        </div>
      </div>
    </div>
  );
};

// Map icon name -> Lucide component (utilisé pour les watchlists)
const ICON_MAP = {
  "shield-check": ShieldCheck,
  "flame": Flame,
  "zap": Zap,
  "repeat": Repeat,
  "eye": Eye,
};

// Petit dot coloré pour la watchlist (à gauche du nom dans le dropdown)
const WatchlistDot = ({ color }) => (
  <span style={{
    width: 8, height: 8, borderRadius: "50%",
    backgroundColor: color || T.forestGreen, flexShrink: 0,
  }} />
);

// Dropdown switcher pour sélectionner la watchlist active
const WatchlistSwitcher = ({ watchlists, activeId, onSelect, onOpenCreate, loading }) => {
  const [open, setOpen] = useState(false);
  const active = watchlists.find((w) => w.watchlist_id === activeId);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((s) => !s)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          backgroundColor: T.bgSurface,
          border: `1.5px solid ${T.inkPrimary}`,
          borderRadius: 10, cursor: "pointer",
          fontFamily: FONT_SANS,
        }}>
        {active && <WatchlistDot color={active.color} />}
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500,
            color: T.inkPrimary, letterSpacing: "-0.015em", lineHeight: 1,
          }}>
            {loading ? "Chargement…" : active ? active.name : "Aucune watchlist"}
          </div>
          {active && (
            <div style={{
              fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary,
              fontWeight: 500, marginTop: 3, letterSpacing: "0.02em",
            }}>
              {active.kind === "OPPORTUNITY" ? "Dynamique sur signaux" :
               active.kind === "DCA" ? "Accumulation programmée" :
               "Convictions long terme"}
              {" · "}
              {active.items_count} actif{active.items_count > 1 ? "s" : ""}
            </div>
          )}
        </div>
        <ChevronDown size={16} strokeWidth={2}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          backgroundColor: T.bgSurface,
          border: `1.5px solid ${T.inkPrimary}`,
          borderRadius: 10, overflow: "hidden", zIndex: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}>
          {watchlists.map((w, i) => {
            const isActive = w.watchlist_id === activeId;
            const Icon = w.icon ? ICON_MAP[w.icon] : null;
            return (
              <div
                key={w.watchlist_id}
                onClick={() => { onSelect(w.watchlist_id); setOpen(false); }}
                style={{
                  padding: "12px 14px",
                  borderBottom: i === watchlists.length - 1 && !onOpenCreate
                    ? "none" : `1px solid ${T.borderSubtle}`,
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer",
                  backgroundColor: isActive ? T.bgHover : T.bgSurface,
                  transition: "background-color 200ms",
                }}>
                <WatchlistDot color={w.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {Icon && <Icon size={13} strokeWidth={2} color={T.inkSecondary} />}
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 13.5,
                      fontWeight: isActive ? 700 : 500,
                      color: T.inkPrimary,
                    }}>{w.name}</span>
                    {w.is_default && (
                      <span style={{
                        fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
                        letterSpacing: "0.1em", color: T.gold,
                        padding: "2px 5px", border: `1px solid ${T.gold}`,
                        borderRadius: 3, textTransform: "uppercase",
                      }}>défaut</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: FONT_SANS, fontSize: 11,
                    color: T.inkTertiary, fontWeight: 500, marginTop: 2,
                  }}>
                    {w.kind === "OPPORTUNITY" ? "Dynamique" :
                     w.kind === "DCA" ? "DCA" : "Conviction"}
                    {" · "}{w.items_count} actif{w.items_count > 1 ? "s" : ""}
                    {w.account_name && ` · ${w.account_name}`}
                  </div>
                </div>
                {isActive && <CheckCircle2 size={14} strokeWidth={2.5} color={T.forestGreen} />}
              </div>
            );
          })}
          <div
            onClick={() => { setOpen(false); onOpenCreate(); }}
            style={{
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", backgroundColor: T.bgSurface,
              transition: "background-color 200ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.bgSurface}>
            <Plus size={14} strokeWidth={2.5} color={T.forestGreen} />
            <span style={{
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              color: T.forestGreen,
            }}>Nouvelle watchlist</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Accordion pour créer une watchlist (pas de modale — anti-pattern noté)
const CreateWatchlistAccordion = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("CONVICTION");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) {
      setErr("Le nom est requis");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate({ name: name.trim(), kind });
      setName("");
      setKind("CONVICTION");
      onClose();
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      margin: "0 20px 16px", padding: 16,
      backgroundColor: T.bgSurface,
      border: `1.5px solid ${T.forestGreen}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Eyebrow variant="accent">Nouvelle watchlist</Eyebrow>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: T.inkTertiary,
        }}><X size={16} strokeWidth={2} /></button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{
          display: "block", fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: T.inkTertiary, marginBottom: 6,
        }}>Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Pépites US, DCA Tech, …"
          style={{
            width: "100%", padding: "10px 12px",
            border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 14, color: T.inkPrimary,
            backgroundColor: T.bgCanvas,
            outline: "none",
          }}
          onFocus={(e) => e.target.style.borderColor = T.inkPrimary}
          onBlur={(e) => e.target.style.borderColor = T.borderSubtle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: "block", fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: T.inkTertiary, marginBottom: 6,
        }}>Type</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { k: "CONVICTION", label: "Conviction", desc: "Liste fixe long terme" },
            { k: "OPPORTUNITY", label: "Opportunités", desc: "Dynamique sur signaux" },
            { k: "DCA", label: "DCA", desc: "Accumulation programmée" },
          ].map((opt) => {
            const active = kind === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => setKind(opt.k)}
                style={{
                  flex: 1, minWidth: 90,
                  padding: "10px 8px", textAlign: "left",
                  border: `1.5px solid ${active ? T.forestGreen : T.borderSubtle}`,
                  backgroundColor: active ? T.bgPour : T.bgCanvas,
                  borderRadius: 8, cursor: "pointer",
                }}>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 12.5,
                  fontWeight: active ? 700 : 600,
                  color: active ? T.forestGreen : T.inkPrimary,
                }}>{opt.label}</div>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary,
                  fontWeight: 500, marginTop: 2,
                }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {err && (
        <div style={{
          fontFamily: FONT_SANS, fontSize: 12, color: T.burgundy,
          marginBottom: 10, fontWeight: 500,
        }}>{err}</div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        style={{
          width: "100%", padding: 12,
          backgroundColor: T.inkPrimary, color: T.inkOnDark,
          border: "none", borderRadius: 10,
          fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600,
          cursor: submitting ? "default" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}>
        {submitting ? "Création…" : "Créer la watchlist"}
      </button>
    </div>
  );
};

// Accordion pour ajouter un actif (recherche)
const AddAssetAccordion = ({ open, onClose, onAddAsset, currentWatchlistName }) => {
  const { query, setQuery, results, loading, error, createUserAsset } = useAssetSearch();
  const [busyAssetId, setBusyAssetId] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  if (!open) return null;

  const handleAddInternal = async (r) => {
    setBusyAssetId(r.asset_id);
    setSubmitErr(null);
    try {
      await onAddAsset(r.asset_id);
      setQuery("");
    } catch (e) {
      setSubmitErr(e.message || "Erreur");
    } finally {
      setBusyAssetId(null);
    }
  };

  const handleAddExternal = async (r) => {
    const key = `ext:${r.ticker}:${r.exchange_mic}`;
    setBusyAssetId(key);
    setSubmitErr(null);
    try {
      const newAssetId = await createUserAsset(r);
      await onAddAsset(newAssetId);
      setQuery("");
    } catch (e) {
      setSubmitErr(e.message || "Erreur");
    } finally {
      setBusyAssetId(null);
    }
  };

  return (
    <div style={{
      margin: "0 20px 16px", padding: 16,
      backgroundColor: T.bgSurface,
      border: `1.5px solid ${T.forestGreen}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Eyebrow variant="accent">Ajouter un actif à {currentWatchlistName}</Eyebrow>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: T.inkTertiary,
        }}><X size={16} strokeWidth={2} /></button>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} strokeWidth={2} color={T.inkTertiary}
          style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ticker ou nom (ex: NVDA, Carrefour, ISIN…)"
          autoFocus
          style={{
            width: "100%", padding: "10px 12px 10px 34px",
            border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 14, color: T.inkPrimary,
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

      {results.internal.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: T.forestGreen, marginBottom: 6,
          }}>Univers Nexial</div>
          {results.internal.map((r) => (
            <SearchResultRow
              key={r.asset_id}
              ticker={r.ticker}
              name={r.asset_name}
              meta={[r.exchange_mic, r.currency, r.coverage_level === "NEXIAL_CORE" ? "★ Couvert" : "Suivi simple"].filter(Boolean).join(" · ")}
              isPremium={r.coverage_level === "NEXIAL_CORE"}
              busy={busyAssetId === r.asset_id}
              onAdd={() => handleAddInternal(r)}
            />
          ))}
        </div>
      )}

      {results.external.length > 0 && (
        <div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: T.inkTertiary, marginBottom: 6,
          }}>Marchés externes (suivi simple)</div>
          {results.external.map((r) => {
            const key = `ext:${r.ticker}:${r.exchange_mic}`;
            return (
              <SearchResultRow
                key={key}
                ticker={r.ticker}
                name={r.asset_name}
                meta={[r.exchange_mic, r.currency, r.country].filter(Boolean).join(" · ")}
                isPremium={false}
                isTracked
                busy={busyAssetId === key}
                onAdd={() => handleAddExternal(r)}
              />
            );
          })}
        </div>
      )}

      {!results.external_search_available && (
        <div style={{
          marginTop: 10, padding: "8px 10px",
          backgroundColor: T.bgAlert, borderRadius: 6,
          fontFamily: FONT_SANS, fontSize: 11, color: T.amber,
          fontWeight: 500, lineHeight: 1.4,
        }}>
          Recherche externe désactivée (TWELVE_DATA_API_KEY manquante).
          Seuls les actifs déjà dans nx.assets sont recherchés.
        </div>
      )}
    </div>
  );
};

const SearchResultRow = ({ ticker, name, meta, isPremium, isTracked, busy, onAdd }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 8px", borderRadius: 6,
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
          fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "0.02em",
        }}>{ticker}</span>
        {isPremium && (
          <span style={{
            fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.1em", color: T.gold,
            padding: "1px 5px", border: `1px solid ${T.gold}`,
            borderRadius: 3, textTransform: "uppercase",
          }}>★</span>
        )}
        {isTracked && (
          <span style={{
            fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.1em", color: T.inkTertiary,
            padding: "1px 5px", border: `1px solid ${T.inkTertiary}`,
            borderRadius: 3, textTransform: "uppercase",
          }}>suivi</span>
        )}
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
        fontWeight: 500, marginTop: 2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{name}</div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary,
        fontWeight: 500, marginTop: 1, letterSpacing: "0.02em",
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

const WatchlistPage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");
  const [watchlistFilters, setWatchlistFilters] = useState([]);
  const [watchlistSort, setWatchlistSort] = useState("score_desc");
  const [activeId, setActiveId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  const { watchlists, loading: wlLoading, refetch: refetchWatchlists, create: createWatchlist } = useWatchlists();

  // Auto-sélection: default watchlist au premier load
  React.useEffect(() => {
    if (!activeId && watchlists.length > 0) {
      const context = getTradingContext();
      const contextual = watchlists.find((w) => matchesTradingContext(w, context.mode));
      const def = contextual || watchlists.find((w) => w.is_default) || watchlists[0];
      setActiveId(def.watchlist_id);
    }
  }, [watchlists, activeId]);

  const activeWatchlist = watchlists.find((w) => w.watchlist_id === activeId);
  const { items, loading: itemsLoading, error, refetch: refetchItems, addItem, removeItem } = useWatchlistItems(activeId);
  const { refreshing, handleRefresh } = useManualRefresh(async () => {
    await Promise.all([refetchWatchlists(), refetchItems()]);
  });

  React.useEffect(() => {
    setFilter("all");
  }, [activeId]);

  // Adapter Supabase row -> WatchlistRow expected shape (préserve sous-composants existants)
  const adaptedItems = useMemo(() => {
    return (items || []).map((it) => ({
      ...it,
      ticker: it.ticker,
      name: it.asset_name || it.name || it.ticker,
      state: it.signal || it.signal_label || "UNKNOWN",
      score: Number(it.opportunity_score ?? 0),
      quality: it.in_portfolio ? "DETENU" : "WATCHED",
      sector: it.sector || "",
      price: Number(it.current_price ?? it.last_price ?? 0),
      isHeld: it.in_portfolio === true,
      currency: it.asset_currency || it.currency || "USD",
      asset_id: it.asset_id,
    })).sort((a, b) => Number(b.opportunity_score ?? b.score ?? 0) - Number(a.opportunity_score ?? a.score ?? 0));
  }, [items]);

  const filtered = useMemo(() => {
    let next = [...adaptedItems];
    if (filter === "opportunities") next = next.filter((w) =>
      w.state === "BUY_ZONE" || w.state === "HOT_PULLBACK");
    if (filter === "held") next = next.filter((w) => w.isHeld);
    if (filter === "watch") next = next.filter((w) =>
      w.state === "WATCH_PULLBACK" || w.state === "WATCH_BORDERLINE");
    if (watchlistFilters.includes("buy_zone")) next = next.filter((w) => liveWatchlistInBuyZone(w));
    if (watchlistFilters.includes("not_held")) next = next.filter((w) => !w.isHeld);
    if (watchlistFilters.includes("tier1")) next = next.filter((w) => Number(w.opportunity_score ?? w.score ?? 0) >= 70 || w.tier === "tier1_core");
    if (watchlistSort === "drawdown") next.sort((a, b) => Number(a.drawdown_from_high_pct ?? 0) - Number(b.drawdown_from_high_pct ?? 0));
    else if (watchlistSort === "z1_distance") next.sort((a, b) => Number(liveWatchlistZDistance(a) ?? 999) - Number(liveWatchlistZDistance(b) ?? 999));
    else if (watchlistSort === "perf_1m") next.sort((a, b) => Number(b.perf_1m_pct ?? 0) - Number(a.perf_1m_pct ?? 0));
    else next.sort((a, b) => Number(b.opportunity_score ?? b.score ?? 0) - Number(a.opportunity_score ?? a.score ?? 0));
    return next;
  }, [adaptedItems, filter, watchlistFilters, watchlistSort]);

  const toggleWatchlistFilter = (key) => setWatchlistFilters((current) => (
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  ));

  const oppCount = adaptedItems.filter((w) =>
    w.state === "BUY_ZONE" || w.state === "HOT_PULLBACK").length;
  const heldCount = adaptedItems.filter((w) => w.isHeld).length;
  const watchCount = adaptedItems.filter((w) =>
    w.state === "WATCH_PULLBACK" || w.state === "WATCH_BORDERLINE").length;

  const isOpportunityWl = activeWatchlist?.kind === "OPPORTUNITY";
  const watchlistFilterDefs = [
    { key: "buy_zone", label: "In Buy Zone", count: adaptedItems.filter((w) => liveWatchlistInBuyZone(w)).length },
    { key: "not_held", label: "Pas en portefeuille", count: adaptedItems.filter((w) => !w.isHeld).length },
    { key: "tier1", label: "Tier 1", count: adaptedItems.filter((w) => Number(w.opportunity_score ?? w.score ?? 0) >= 70 || w.tier === "tier1_core").length },
  ];
  const watchlistSortOptions = [
    { value: "score_desc", label: "Score opp. DESC" },
    { value: "drawdown", label: "Drawdown 52w" },
    { value: "z1_distance", label: "Distance Z1" },
    { value: "perf_1m", label: "Perf 1M" },
  ];

  const handleCreate = async (input) => {
    const newId = await createWatchlist(input);
    setActiveId(newId);
  };

  const handleAddAsset = async (assetId) => {
    await addItem(assetId);
    setShowAddAsset(false);
  };

  return (
    <>
      <header style={{ padding: "28px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Eyebrow>Watchlist</Eyebrow>
          <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
        </div>
        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <WatchlistSwitcher
            watchlists={watchlists}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); setShowAddAsset(false); }}
            onOpenCreate={() => { setShowCreate(true); setShowAddAsset(false); }}
            loading={wlLoading}
          />
        </div>
        {activeWatchlist && !isOpportunityWl && (
          <button
            onClick={() => { setShowAddAsset((s) => !s); setShowCreate(false); }}
            style={{
              width: "100%", padding: "10px 14px",
              backgroundColor: showAddAsset ? T.bgPour : T.bgSurface,
              color: T.forestGreen,
              border: `1.5px dashed ${T.forestGreen}`,
              borderRadius: 8, cursor: "pointer",
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            <Plus size={14} strokeWidth={2.5} />
            Ajouter un actif
          </button>
        )}
        {isOpportunityWl && (
          <div style={{
            padding: "10px 12px", backgroundColor: T.bgAlert, borderRadius: 8,
            fontFamily: FONT_SANS, fontSize: 11.5, color: T.amber,
            fontWeight: 500, lineHeight: 1.45,
          }}>
            Watchlist dynamique : les actifs apparaissent automatiquement quand
            un signal Nexial (BUY_ZONE, HOT_PULLBACK, WATCH_PULLBACK) se déclenche.
          </div>
        )}
      </header>

      <CreateWatchlistAccordion
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <AddAssetAccordion
        open={showAddAsset}
        onClose={() => setShowAddAsset(false)}
        onAddAsset={handleAddAsset}
        currentWatchlistName={activeWatchlist?.name || ""}
      />

      <div style={{
        padding: "0 20px 16px", display: "flex", justifyContent: "space-between",
        alignItems: "center", gap: 12,
      }}>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 13, color: T.inkTertiary, fontWeight: 500,
        }}>
          {itemsLoading ? "Chargement…" : `${adaptedItems.length} actif${adaptedItems.length > 1 ? "s" : ""}`}
        </div>
        <SegmentedControl
          options={[
            { value: "list", label: "", icon: <List size={14} strokeWidth={2} /> },
            { value: "card", label: "", icon: <LayoutGrid size={14} strokeWidth={2} /> },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      <FilterBar
        filters={watchlistFilterDefs}
        sortOptions={watchlistSortOptions}
        activeFilters={watchlistFilters}
        activeSort={watchlistSort}
        onChange={({ filter, sort }) => {
          if (sort) setWatchlistSort(sort);
          if (filter) toggleWatchlistFilter(filter);
        }}
      />

      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={adaptedItems.length}>
          Tous
        </FilterChip>
        <FilterChip active={filter === "opportunities"} onClick={() => setFilter("opportunities")} count={oppCount}>
          Opportunités
        </FilterChip>
        <FilterChip active={filter === "held"} onClick={() => setFilter("held")} count={heldCount}>
          Détenus
        </FilterChip>
        <FilterChip active={filter === "watch"} onClick={() => setFilter("watch")} count={watchCount}>
          Surveillance
        </FilterChip>
      </div>

      {error && (
        <div style={{ padding: "12px 20px", color: T.burgundy, fontFamily: FONT_SANS, fontSize: 13 }}>
          Erreur de chargement — réessai automatique dans 60s.
        </div>
      )}

      {viewMode === "list" ? (
        <div style={{
          margin: "0 20px", backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
        }}>
          {filtered.length === 0 && !itemsLoading ? (
            <EmptyState
              icon={Eye}
              title={isOpportunityWl ? "Aucune opportunité" : "Watchlist vide"}
              message={isOpportunityWl
                ? "Aucun signal favorable détecté actuellement. La liste se met à jour automatiquement."
                : filter === "all"
                  ? "Ajoute des actifs avec le bouton ci-dessus."
                  : "Aucun actif ne correspond à ce filtre."}
            />
          ) : (
            filtered.map((w, i) => (
              <WatchlistItemRow key={w.ticker + ":" + w.asset_id} item={w} viewMode="list"
                isLast={i === filtered.length - 1}
                onClick={() => onAssetClick(w.ticker)}
                onRemoveRequest={setItemToRemove}
                canRemove={!isOpportunityWl} />
            ))
          )}
        </div>
      ) : (
        <div style={{
          margin: "0 20px", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {filtered.map((w) => (
            <WatchlistItemRow key={w.ticker + ":" + w.asset_id} item={w} viewMode="card"
              onClick={() => onAssetClick(w.ticker)}
              onRemoveRequest={setItemToRemove}
              canRemove={!isOpportunityWl} />
          ))}
        </div>
      )}
      {itemToRemove && (
        <RemoveAssetConfirmModal
          item={itemToRemove}
          onClose={() => setItemToRemove(null)}
          onConfirm={removeItem}
        />
      )}
      <div style={{ height: 32 }} />
    </>
  );
};

// ============================================================
// PAGE — DÉTAIL ASSET
// ============================================================
const DetailHeader = ({ asset, onBack }) => {
  const positive = asset.chg1d >= 0;
  const isFallback = asset.isFallback === true;
  const priceFormatted = asset.currency === "USD" ? `$${fmtUsd(asset.currentPrice)}` : asset.currency === "EUR" ? `${fmtEur(asset.currentPrice)} €` : `${asset.currentPrice}`;
  return (
    <header style={{ padding: "16px 20px 0" }}>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
        background: "none", border: "none", color: T.inkSecondary,
        fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, cursor: "pointer",
      }}>
        <ArrowLeft size={16} strokeWidth={2} />
        Retour
      </button>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 12, color: T.inkTertiary,
            fontWeight: 600, letterSpacing: "0.04em",
          }}>{asset.exchange} · {asset.currency}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: T.inkQuaternary }} />
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
            {asset.sector}
          </span>
        </div>
        <HeroNumber size="L" style={{ marginBottom: 4 }}>{asset.name}</HeroNumber>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700,
            color: T.inkPrimary, letterSpacing: "-0.02em",
          }}>{isFallback ? "—" : priceFormatted}</span>
          <MetricChip variant={positive ? "positive" : "negative"}>
            {isFallback ? "—" : `${positive ? "+" : ""}${asset.chg1d.toFixed(2)}%`}
          </MetricChip>
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
            aujourd'hui
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <Badge variant="success">
          <Award size={9} strokeWidth={2.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          {asset.qualityClass}
        </Badge>
        <Badge variant="outline">{stateLabel(asset.state)}</Badge>
        <Badge variant="outline">Régime {asset.marketRegime}</Badge>
      </div>
    </header>
  );
};

const DetailScoreCard = ({ asset }) => (
  <section style={{ margin: "28px 20px 0", padding: 20,
    backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`, borderRadius: 12 }}>
    <Eyebrow style={{ marginBottom: 14 }}>Évaluation Nexial</Eyebrow>
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
      <ScoreGauge value={asset.scoreCombined} max={100} size={88} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: T.inkTertiary, marginBottom: 4,
        }}>Score combiné</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 500,
          color: T.inkPrimary, lineHeight: 1.4,
        }}>
          Signal <span style={{ color: T.amber, fontWeight: 700 }}>modéré</span>.
          Surveiller pour confirmation.
        </div>
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${T.borderSubtle}`, paddingTop: 12 }}>
      <ScoreBar label="Momentum" value={asset.momentumScore} />
      <ScoreBar label="Volume" value={asset.volumeScore} />
      <ScoreBar label="Structure" value={asset.structureScore} />
      <ScoreBar label="Fondamental" value={asset.fundamentalScore} />
    </div>
  </section>
);

const ThesisCard = ({ asset }) => (
  <section style={{ margin: "20px 20px 0" }}>
    <Eyebrow style={{ marginBottom: 10 }}>Thèse</Eyebrow>
    <p style={{
      fontFamily: FONT_DISPLAY, fontSize: 16, lineHeight: 1.5,
      color: T.inkPrimary, fontStyle: "italic", fontWeight: 400,
      letterSpacing: "-0.005em", margin: 0,
    }}>« {asset.thesis} »</p>
  </section>
);

const PourContre = ({ asset }) => (
  <section style={{ margin: "20px 20px 0", display: "grid", gap: 12 }}>
    <div style={{ backgroundColor: T.bgPour, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: T.forestGreen }} />
        <Eyebrow variant="accent">Pour</Eyebrow>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {asset.pour.map((p, i) => (
          <li key={i} style={{
            fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.5,
            color: T.inkPrimary, fontWeight: 500,
            paddingBottom: i === asset.pour.length - 1 ? 0 : 6,
          }}>{p}</li>
        ))}
      </ul>
    </div>
    <div style={{ backgroundColor: T.bgContre, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: T.burgundy }} />
        <Eyebrow variant="danger">Contre</Eyebrow>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {asset.contre.map((c, i) => (
          <li key={i} style={{
            fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.5,
            color: T.inkPrimary, fontWeight: 500,
            paddingBottom: i === asset.contre.length - 1 ? 0 : 6,
          }}>{c}</li>
        ))}
      </ul>
    </div>
  </section>
);

const OrderPlanCard = ({ asset }) => (
  <section style={{ margin: "24px 20px 0" }}>
    <Eyebrow variant="accent" style={{ marginBottom: 6 }}>Plan d'ordres</Eyebrow>
    <HeroNumber size="M" style={{ marginBottom: 12 }}>3 paliers étagés</HeroNumber>
    <div style={{
      backgroundColor: T.bgSurface, border: `1.5px solid ${T.inkPrimary}`,
      borderRadius: 12, overflow: "hidden",
    }}>
      {asset.paliers.map((p, i) => (
        <div key={i} style={{
          padding: "14px 16px",
          borderBottom: i === asset.paliers.length - 1 ? "none" : `1px solid ${T.borderSubtle}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              backgroundColor: T.bgPour, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: T.forestGreen,
            }}>{p.rank}</div>
            <span style={{
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSecondary,
            }}>{p.role}</span>
            <span style={{ marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary, fontWeight: 600 }}>
              {p.size}% size
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 500,
              color: T.inkPrimary, letterSpacing: "-0.015em",
            }}>${fmtUsd(p.price)}</span>
            <MetricChip variant="negative">{p.dist.toFixed(2)}%</MetricChip>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary, lineHeight: 1.45 }}>
            {p.desc}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const TechIndicators = ({ asset }) => {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ margin: "24px 20px 0" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "14px 16px",
        backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
        borderRadius: 12, cursor: "pointer", color: T.inkPrimary,
      }}>
        <Eyebrow>Indicateurs techniques</Eyebrow>
        <ChevronDown size={18} strokeWidth={2} 
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: 16, backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px",
        }}>
          {[
            { label: "RSI 14j", value: asset.rsi14, unit: "" },
            { label: "Bollinger %B", value: asset.bollingerPctB, unit: "%" },
            { label: "ATR 14j", value: asset.atr14.toFixed(2), unit: "$" },
            { label: "5j", value: (asset.chg5d > 0 ? "+" : "") + asset.chg5d.toFixed(2), unit: "%" },
            { label: "10j", value: (asset.chg10d > 0 ? "+" : "") + asset.chg10d.toFixed(2), unit: "%" },
            { label: "vs 52w high", value: asset.dist52wHigh.toFixed(2), unit: "%" },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: T.inkTertiary, marginBottom: 3,
              }}>{stat.label}</div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700,
                color: T.inkPrimary, letterSpacing: "-0.01em",
              }}>{stat.value}{stat.unit}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const DetailActions = ({ paliers, ticker, currency, onConfirmAll, onModifyClick }) => {
  const validCount = paliers.filter((p) => p.proposal_id).length;
  return (
    <section style={{ margin: "28px 20px 32px" }}>
      <button
        onClick={onConfirmAll}
        data-button-id="MOB-AST-002"
        style={{
          width: "100%", padding: "16px", backgroundColor: T.inkPrimary,
          color: T.inkOnDark, border: "none", borderRadius: 12,
          fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
          letterSpacing: "0.01em", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        Valider les {validCount} ordres
        <ArrowUpRight size={15} strokeWidth={2.2} />
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <button
          onClick={onModifyClick}
          data-button-id="MOB-AST-003"
          style={{
            padding: "14px", backgroundColor: T.bgSurface, color: T.inkPrimary,
            border: `1.5px solid ${T.inkPrimary}`, borderRadius: 10,
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >Modifier</button>
        <button
          data-button-id="MOB-AST-004"
          style={{
            padding: "14px", backgroundColor: T.bgSurface, color: T.inkPrimary,
            border: `1.5px solid ${T.inkPrimary}`, borderRadius: 10,
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >Reporter</button>
      </div>
    </section>
  );
};

const detailMoney = (value, currency = "EUR", digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits })} ${currency || "EUR"}`;
};

const rsiInterpretation = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Non disponible";
  if (n < 30) return "Survente";
  if (n > 70) return "Surachat";
  return "Neutre";
};

const DetailMetric = ({ label, value, sub, color = T.inkPrimary }) => (
  <div style={{
    padding: 12, backgroundColor: T.bgSurface,
    border: `1px solid ${T.borderSubtle}`, borderRadius: 10,
  }}>
    <div style={{
      fontFamily: FONT_SANS, fontSize: 10, color: T.inkTertiary,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
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

const ZoneIndicator = ({ label, price, currency, currentPrice }) => {
  const dist = Number(currentPrice) > 0 && Number(price) > 0
    ? ((Number(price) - Number(currentPrice)) / Number(currentPrice)) * 100
    : null;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 800, color: T.forestGreen }}>
        {label}
      </div>
      <div style={{ marginTop: 3, fontFamily: FONT_MONO, fontSize: 12, color: T.inkPrimary, fontWeight: 700 }}>
        {detailMoney(price, currency)}
      </div>
      <div style={{ marginTop: 2, fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary }}>
        {dist == null ? "-" : `${dist >= 0 ? "+" : ""}${dist.toFixed(1)}%`}
      </div>
    </div>
  );
};

const EnrichedAssetSections = ({ asset, liveAsset }) => {
  const currency = asset.currency || liveAsset?.currency || "EUR";
  const currentPrice = Number(asset.currentPrice ?? liveAsset?.current_price ?? 0);
  const pnlPct = Number(liveAsset?.pnl_pct ?? 0);
  const pnlPositive = pnlPct >= 0;
  const zones = [
    { label: "Z1", price: liveAsset?.z1_price ?? asset.paliers?.[0]?.price },
    { label: "Z2", price: liveAsset?.z2_price ?? asset.paliers?.[1]?.price },
    { label: "Z3", price: liveAsset?.z3_price ?? asset.paliers?.[2]?.price },
  ].filter((z) => z.price != null);
  const activeAlerts = [
    liveAsset?.signal ? { id: "signal", label: liveAsset.signal, status: liveAsset.freshness_status || "ACTIVE" } : null,
    ...(liveAsset?.active_proposals || []).map((p) => ({
      id: p.proposal_id,
      label: `${p.side || "ORDER"} ${detailMoney(p.proposed_price, p.proposed_currency || currency)}`,
      status: p.status,
    })),
  ].filter(Boolean);

  return (
    <section style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <DetailMetric label="RSI 14" value={asset.rsi14 ? asset.rsi14.toFixed(1) : "-"} sub={rsiInterpretation(asset.rsi14)} />
        <DetailMetric label="Drawdown" value={`${Number(asset.dist52wHigh ?? 0).toFixed(1)}%`} color={T.burgundy} />
        <DetailMetric label="vs EMA200" value="-" sub="Non disponible" />
        <DetailMetric label="Volume vs 20j" value="-" sub="Non disponible" />
      </div>

      {zones.length > 0 && (
        <div style={{
          padding: 14, backgroundColor: T.bgPour,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
        }}>
          <Eyebrow>Zones de buy</Eyebrow>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
            {zones.map((z) => (
              <ZoneIndicator key={z.label} {...z} currency={currency} currentPrice={currentPrice} />
            ))}
          </div>
        </div>
      )}

      {asset.isHeld && (
        <div style={{
          padding: 14, backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12,
        }}>
          <Eyebrow>Ma position</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <DetailMetric label="Quantite" value={Number(liveAsset?.held_quantity ?? 0).toFixed(2)} />
            <DetailMetric label="PRU" value={liveAsset?.held_quantity ? detailMoney(Number(liveAsset.total_invested || 0) / Number(liveAsset.held_quantity || 1), currency) : "-"} />
            <DetailMetric label="Valeur" value={detailMoney(liveAsset?.current_market_value, currency, 0)} />
            <DetailMetric label="P&L" value={`${pnlPositive ? "+" : ""}${pnlPct.toFixed(2)}%`} color={pnlPositive ? T.forestGreen : T.burgundy} />
          </div>
        </div>
      )}

      <div style={{ padding: 14, backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`, borderRadius: 12 }}>
        <Eyebrow>Alertes actives</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {activeAlerts.length === 0 ? (
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>Aucune alerte active</span>
          ) : activeAlerts.map((alert) => (
            <div key={alert.id} style={{
              display: "flex", justifyContent: "space-between", gap: 10,
              fontFamily: FONT_SANS, fontSize: 12, color: T.inkSecondary,
            }}>
              <span>{alert.label}</span>
              <Badge variant="soft">{alert.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 14, backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`, borderRadius: 12 }}>
        <Eyebrow>Historique transactions</Eyebrow>
        <div style={{ marginTop: 10, fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>
          Historique detaille non disponible dans l'API actuelle.
        </div>
      </div>
    </section>
  );
};

const NOTE_KIND_META = {
  thesis: { label: "These", color: T.forestGreen },
  observation: { label: "Observation", color: T.inkSecondary },
  todo: { label: "A faire", color: T.amber },
  event: { label: "Evenement", color: T.burgundy },
};

const formatNoteDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const NoteEditor = ({ initialText = "", initialKind = "observation", onSave, onCancel }) => {
  const [text, setText] = useState(initialText);
  const [kind, setKind] = useState(initialKind);

  return (
    <div style={{
      padding: 12, backgroundColor: T.bgCanvas,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 10,
    }}>
      <select value={kind} onChange={(e) => setKind(e.target.value)} style={{
        width: "100%", padding: "9px 10px", border: `1px solid ${T.borderSubtle}`,
        borderRadius: 8, backgroundColor: T.bgSurface, color: T.inkPrimary,
        fontFamily: FONT_SANS, fontSize: 13,
      }}>
        <option value="thesis">These</option>
        <option value="observation">Observation</option>
        <option value="todo">A faire</option>
        <option value="event">Evenement</option>
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Note libre..."
        style={{
          width: "100%", marginTop: 8, padding: 10, resize: "vertical",
          border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
          backgroundColor: T.bgSurface, color: T.inkPrimary,
          fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.45,
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{
          padding: "8px 10px", border: `1px solid ${T.borderSubtle}`,
          backgroundColor: "transparent", borderRadius: 7,
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
          color: T.inkSecondary, cursor: "pointer",
        }}>Annuler</button>
        <button type="button" disabled={!text.trim()} onClick={() => onSave(text.trim(), kind)} style={{
          padding: "8px 10px", border: "none",
          backgroundColor: T.inkPrimary, color: T.inkOnDark,
          borderRadius: 7, fontFamily: FONT_SANS, fontSize: 12,
          fontWeight: 700, cursor: text.trim() ? "pointer" : "default",
          opacity: text.trim() ? 1 : 0.5,
        }}>Enregistrer</button>
      </div>
    </div>
  );
};

const NoteCard = ({ note, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const kindInfo = NOTE_KIND_META[note.kind] || NOTE_KIND_META.observation;
  const text = note.text ?? note.note_text ?? "";

  if (editing) {
    return (
      <NoteEditor
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
    <div style={{
      padding: 12, backgroundColor: T.bgSurface,
      border: `1px solid ${T.borderSubtle}`, borderRadius: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: kindInfo.color, fontWeight: 800 }}>
          {kindInfo.label}
        </span>
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary }}>
          {formatNoteDate(note.created_at)}
        </span>
      </div>
      <p style={{ margin: 0, fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.5, color: T.inkPrimary }}>
        {text}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => setEditing(true)} style={{
          border: `1px solid ${T.borderSubtle}`, backgroundColor: "transparent",
          borderRadius: 6, padding: 6, color: T.inkSecondary, cursor: "pointer",
        }}><Edit3 size={12} /></button>
        <button type="button" onClick={() => onDelete(note.id)} style={{
          border: "none", backgroundColor: "transparent",
          borderRadius: 6, padding: 6, color: T.burgundy, cursor: "pointer",
        }}><Trash2 size={12} /></button>
      </div>
    </div>
  );
};

const AssetNotesSection = ({ assetId }) => {
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

  React.useEffect(() => {
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
    <section style={{ padding: "0 20px 18px" }}>
      <div style={{ padding: 14, backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Eyebrow>Mes notes ({notes.length})</Eyebrow>
          <button type="button" onClick={() => setAdding((v) => !v)} style={{
            border: `1px solid ${T.borderSubtle}`, backgroundColor: T.bgSurface,
            borderRadius: 7, padding: "7px 9px", color: T.forestGreen,
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 800,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {adding && <NoteEditor onCancel={() => setAdding(false)} onSave={handleSave} />}
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
          {!adding && notes.length === 0 && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary }}>Aucune note pour cet asset.</span>
          )}
        </div>
      </div>
    </section>
  );
};

const AssetDetailPage = ({ ticker, onBack, onConfirmAll, onModifyClick }) => {
  const { asset: liveAsset, loading } = useAssetDetail(ticker);

  // Adapter Supabase live row -> asset shape consommé par les sous-composants existants
  const asset = useMemo(() => {
    // Priority 1: si on a un mock détaillé pour ce ticker, on l'utilise (ISRG/MC/OR avec paliers narratifs)
    if (ASSET_DETAILS[ticker]) {
      const mock = ASSET_DETAILS[ticker];
      // Si on a aussi du live data, on overlay le current_price + perfs + zones
      if (liveAsset) {
        const proposals = liveAsset.active_proposals || [];
        const enrichedPaliers = mock.paliers.map((p, idx) => ({
          ...p,
          proposal_id: proposals[idx]?.proposal_id || p.proposal_id,
        }));
        return {
          ...mock,
          asset_id: liveAsset.asset_id,
          currentPrice: Number(liveAsset.current_price ?? mock.currentPrice),
          chg1d: Number(liveAsset.perf_1d_pct ?? mock.chg1d),
          chg5d: Number(liveAsset.perf_1w_pct ?? mock.chg5d),
          chg10d: Number(liveAsset.perf_1m_pct ?? mock.chg10d),
          dist52wHigh: Number(liveAsset.drawdown_from_high_pct ?? mock.dist52wHigh),
          isHeld: liveAsset.in_portfolio === true,
          paliers: enrichedPaliers,
        };
      }
      return mock;
    }

    // Priority 2: live data brut, on construit le shape attendu
    if (liveAsset && liveAsset.ticker) {
      const proposals = liveAsset.active_proposals || [];
      const adaptedPaliers = proposals.map((p, idx) => ({
        rank: idx + 1,
        role: idx === 0 ? "Probabiliste" : idx === 1 ? "Opportuniste" : "Panic flush",
        price: Number(p.proposed_price),
        dist: Number(liveAsset.current_price && p.proposed_price
          ? ((p.proposed_price - liveAsset.current_price) / liveAsset.current_price * 100)
          : 0),
        size: Math.round(100 / proposals.length),
        proposal_id: p.proposal_id,
        desc: p.rationale ? (p.rationale.length > 80 ? p.rationale.slice(0, 80) + "…" : p.rationale) : "",
      }));

      const signalToState = {
        BUY_ZONE: "BUY_ZONE_PROBA",
        HOT_PULLBACK: "BUY_ZONE_PROBA",
        WATCH_PULLBACK: "WATCH_BUY_ZONE",
        WATCH_BORDERLINE: "WATCH_BORDERLINE",
        TOO_EXPENSIVE: "WATCH_BORDERLINE",
      };

      return {
        asset_id: liveAsset.asset_id,
        ticker: liveAsset.ticker,
        name: liveAsset.asset_name || liveAsset.ticker,
        sector: liveAsset.sector || "—",
        exchange: liveAsset.exchange_region || "—",
        currency: liveAsset.currency,
        currentPrice: Number(liveAsset.current_price ?? 0),
        scoreCombined: Math.round(Number(liveAsset.opportunity_score ?? 0)),
        qualityClass: "—",
        state: signalToState[liveAsset.signal] || liveAsset.signal || "—",
        marketRegime: "—",
        isHeld: liveAsset.in_portfolio === true,
        chg1d: Number(liveAsset.perf_1d_pct ?? 0),
        chg5d: Number(liveAsset.perf_1w_pct ?? 0),
        chg10d: Number(liveAsset.perf_1m_pct ?? 0),
        dist52wHigh: Number(liveAsset.drawdown_from_high_pct ?? 0),
        dist52wLow: 0,
        rsi14: 0,
        bollingerPctB: 0,
        atr14: 0,
        momentumScore: 0,
        volumeScore: 0,
        structureScore: 0,
        fundamentalScore: 0,
        paliers: adaptedPaliers,
        thesis: liveAsset.signal === "BUY_ZONE"
          ? `Signal Nexial BUY_ZONE détecté. Score ${Math.round(Number(liveAsset.opportunity_score ?? 0))}/100. Drawdown ${Number(liveAsset.drawdown_from_high_pct ?? 0).toFixed(1)}% depuis sommet 52s.`
          : liveAsset.signal === "HOT_PULLBACK"
          ? `Pullback sur signal Nexial HOT_PULLBACK. Score ${Math.round(Number(liveAsset.opportunity_score ?? 0))}/100. Surveillance active.`
          : liveAsset.signal === "TOO_EXPENSIVE"
          ? `Actif actuellement TOO_EXPENSIVE selon Nexial. Attendre repli pour renforcement.`
          : `Actif suivi par Nexial. Signal: ${liveAsset.signal || "—"}.`,
        pour: [
          liveAsset.in_portfolio ? `Position détenue : ${Number(liveAsset.held_quantity ?? 0)} unités, PnL ${Number(liveAsset.pnl_pct ?? 0).toFixed(1)}%` : null,
          liveAsset.opportunity_score && liveAsset.opportunity_score >= 70 ? `Score Nexial ${Math.round(Number(liveAsset.opportunity_score))}/100 — opportunité significative` : null,
          liveAsset.drawdown_from_high_pct && liveAsset.drawdown_from_high_pct < -10 ? `Repli ${Number(liveAsset.drawdown_from_high_pct).toFixed(1)}% offre une fenêtre d'achat` : null,
        ].filter(Boolean),
        contre: [
          liveAsset.signal === "TOO_EXPENSIVE" ? "Signal TOO_EXPENSIVE — pas de fenêtre d'entrée actuellement" : null,
          liveAsset.opportunity_score && liveAsset.opportunity_score < 40 ? `Score Nexial ${Math.round(Number(liveAsset.opportunity_score))}/100 modéré` : null,
          liveAsset.freshness_status === "red" ? "Données de marché possiblement obsolètes (vérifier ingestion)" : null,
        ].filter(Boolean),
      };
    }

    // Priority 3: fallback (pas de live data, pas de mock)
    return buildFallbackAsset(ticker);
  }, [ticker, liveAsset]);

  return (
    <>
      <DetailHeader asset={asset} onBack={onBack} />
      <AssetDebugAdminCard ticker={asset.ticker} />
      <DetailScoreCard asset={asset} />
      <ThesisCard asset={asset} />
      <PourContre asset={asset} />
      <EnrichedAssetSections asset={asset} liveAsset={liveAsset} />
      <AssetNotesSection assetId={asset.asset_id || liveAsset?.asset_id} />
      <OrderPlanCard asset={asset} />
      <TechIndicators asset={asset} />
      <DetailActions
        paliers={asset.paliers}
        ticker={asset.ticker}
        currency={asset.currency}
        onConfirmAll={() => onConfirmAll(asset)}
        onModifyClick={() => onModifyClick(asset)}
      />
    </>
  );
};

// ============================================================
// APP ROOT
// ============================================================
export default function NexialApp({ initialPage = "dashboard" } = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [detailTicker, setDetailTicker] = useState(null);
  const showDetail = (ticker) => setDetailTicker(ticker);
  const closeDetail = () => setDetailTicker(null);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!detailTicker || typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailTicker]);

  const { openConfirm, openEdit, ProposalActionModals } = useProposalActions({
    surface: "mobile",
  });

  const handleConfirmAll = (asset) => {
    const proposals = asset.paliers
      .filter((p) => p.proposal_id)
      .map((p) => ({
        proposal_id: p.proposal_id,
        ticker: asset.ticker,
        proposed_price: p.price,
        proposed_quantity: 1,
        proposed_currency: asset.currency,
        rank: p.rank,
      }));
    if (proposals.length === 0) {
      console.warn("[Nexial] Aucun palier avec proposal_id valide");
      return;
    }
    openConfirm(proposals, {
      source_button_id: "MOB-AST-002",
      source_page: "asset_detail",
    });
  };

  const handleModifyClick = (asset) => {
    const firstWithId = asset.paliers.find((p) => p.proposal_id);
    if (!firstWithId) {
      console.warn("[Nexial] Aucun palier avec proposal_id valide");
      return;
    }
    openEdit(
      {
        proposal_id: firstWithId.proposal_id,
        ticker: asset.ticker,
        proposed_price: firstWithId.price,
        proposed_quantity: 1,
        proposed_currency: asset.currency,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user_price: null,
        user_quantity: null,
        user_note: null,
      },
      {
        source_button_id: "MOB-AST-003",
        source_page: "asset_detail",
      }
    );
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: T.bgCanvas,
      fontFamily: FONT_SANS, color: T.inkPrimary,
      WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
    }}>
      <div style={{
        maxWidth: 440, margin: "0 auto", minHeight: "100vh",
        display: "flex", flexDirection: "column",
      }}>
        <main style={{
          flex: 1,
          minHeight: 0,
          overflowY: detailTicker ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}>
          {detailTicker ? (
            <AssetDetailPage
              ticker={detailTicker}
              onBack={closeDetail}
              onConfirmAll={handleConfirmAll}
              onModifyClick={handleModifyClick}
            />
          ) : currentPage === "dashboard" ? (
            <DashboardPage onAssetClick={showDetail} onNavigate={setCurrentPage} />
          ) : currentPage === "today" ? (
            <TodayPage onAssetClick={showDetail} onNavigate={setCurrentPage} />
          ) : currentPage === "orders" ? (
            <OrdersPage onAssetClick={showDetail} />
          ) : currentPage === "portfolio" ? (
            <PortfolioPage onAssetClick={showDetail} />
          ) : (
            <WatchlistPage onAssetClick={showDetail} />
          )}
        </main>
        {!detailTicker && (
          <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
        )}
      </div>
      <ProposalActionModals />
    </div>
  );
}
