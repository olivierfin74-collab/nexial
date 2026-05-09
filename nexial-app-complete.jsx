import React, { useState, useMemo } from "react";
import {
  ArrowUpRight, ChevronRight, Bell, Wallet, Sparkles, Activity,
  ArrowLeft, Home, ListChecks, Eye, Briefcase, ChevronDown,
  Award, LayoutGrid, List, Filter, Clock, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, AlertCircle, Search,
} from "lucide-react";
import { useProposalActions } from "@/lib/hooks/useProposalActions";

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
  { ticker: "MELI", name: "MercadoLibre", kind: "FLASH_DROP", score: 62.5, price: 1632.03, severity: "critical" },
  { ticker: "CRWD", name: "CrowdStrike", kind: "OVERBOUGHT_HOLD", score: 100, price: 505.67, severity: "warning" },
  { ticker: "PANX", name: "Amundi Nasdaq-100", kind: "OVERBOUGHT_HOLD", score: 85, price: 75.86, severity: "warning" },
  { ticker: "NVDA", name: "Nvidia", kind: "OVERBOUGHT_HOLD", score: 80, price: 211.60, severity: "warning" },
  { ticker: "SNOW", name: "Snowflake", kind: "OVERBOUGHT_HOLD", score: 73, price: 153.82, severity: "warning" },
  { ticker: "RF", name: "Eurazeo", kind: "OVERBOUGHT_HOLD", score: 65, price: 48.32, severity: "warning" },
  { ticker: "ALSTI", name: "STIF", kind: "OVERBOUGHT_HOLD", score: 65, price: 50.25, severity: "warning" },
  { ticker: "MC", name: "LVMH", kind: "OVERBOUGHT_HOLD", score: 40, price: 478.30, severity: "info" },
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

const ASSET_DETAIL = {
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
};

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
const DashboardHeader = () => {
  const today = useMemo(() => new Date(), []);
  return (
    <header style={{ padding: "28px 20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Eyebrow>Nexial</Eyebrow>
          <HeroNumber size="L" style={{ margin: "8px 0 6px" }}>Bonjour Olivier</HeroNumber>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500,
            color: T.inkTertiary, textTransform: "capitalize",
          }}>{fmtDate(today)}</div>
        </div>
        <button aria-label="Notifications" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 42, height: 42, borderRadius: "50%", backgroundColor: T.bgSurface,
          border: `1.5px solid ${T.inkPrimary}`, cursor: "pointer", position: "relative",
        }}>
          <Bell size={17} strokeWidth={2} color={T.inkPrimary} />
          <span style={{
            position: "absolute", top: 8, right: 10, width: 8, height: 8,
            borderRadius: "50%", backgroundColor: T.burgundy,
            border: `2px solid ${T.bgCanvas}`,
          }} />
        </button>
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

const SectionToDoToday = ({ onAssetClick }) => (
  <section style={{ marginTop: 16 }}>
    <div style={{ padding: "0 20px 14px" }}>
      <Eyebrow variant="accent">À faire aujourd'hui</Eyebrow>
      <HeroNumber size="M" style={{ marginTop: 6 }}>
        {ACTIONS_TODAY.length} décisions en attente
      </HeroNumber>
    </div>
    <div style={{
      backgroundColor: T.bgSurface, border: `1.5px solid ${T.inkPrimary}`,
      borderRadius: 12, margin: "0 20px", overflow: "hidden",
    }}>
      {ACTIONS_TODAY.map((a, i) => (
        <ActionCard key={i} action={a} isLast={i === ACTIONS_TODAY.length - 1}
          onClick={() => onAssetClick(a.ticker)} />
      ))}
    </div>
  </section>
);

const YourMoney = ({ onAccountClick }) => {
  const positive = PORTFOLIO.pnlEur > 0;
  return (
    <section style={{ marginTop: 36, padding: "0 20px" }}>
      <Eyebrow>Ton argent</Eyebrow>
      <div style={{ marginTop: 12 }}>
        <HeroNumber size="XL">€{fmtEur(PORTFOLIO.totalEur)}</HeroNumber>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <MetricChip variant={positive ? "positive" : "negative"}>
            {positive ? "+" : ""}{PORTFOLIO.pnlPct.toFixed(1)}%
          </MetricChip>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: T.inkSecondary, fontWeight: 600 }}>
            +€{fmtEur(PORTFOLIO.pnlEur)}
          </span>
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.inkTertiary, fontWeight: 500 }}>
            depuis l'achat
          </span>
        </div>
      </div>
      <div style={{
        marginTop: 22, padding: "16px 18px", backgroundColor: T.bgDarkPanel,
        borderRadius: 12, display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          backgroundColor: "rgba(122, 168, 134, 0.18)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Wallet size={18} strokeWidth={2} color={T.forestGreenPale} />
        </div>
        <div style={{ flex: 1 }}>
          <Eyebrow variant="onDarkAccent">Cash disponible</Eyebrow>
          <HeroNumber size="M" color={T.inkOnDark} style={{ marginTop: 3 }}>
            €{fmtEur(PORTFOLIO.cashEur)}
          </HeroNumber>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4, color: T.inkOnDark,
          fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
        }}>Déployer<ArrowUpRight size={15} strokeWidth={2.2} /></div>
      </div>
      <div style={{
        marginTop: 22, backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
      }}>
        {ACCOUNTS.map((acc, i) => (
          <div key={i} onClick={() => onAccountClick && onAccountClick(acc)} style={{
            padding: "14px 16px",
            borderBottom: i === ACCOUNTS.length - 1 ? "none" : `1px solid ${T.borderSubtle}`,
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: T.inkPrimary }}>
                {acc.name}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: T.inkTertiary,
                marginTop: 2, fontWeight: 500 }}>{acc.broker}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <HeroNumber size="S">€{fmtEur(acc.value)}</HeroNumber>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.inkSecondary,
                marginTop: 2, fontWeight: 600 }}>{acc.share.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Timeline = () => (
  <section style={{ marginTop: 36, padding: "0 20px 32px" }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
      <Eyebrow>Depuis hier</Eyebrow>
      <button style={{
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

const DashboardPage = ({ onAssetClick }) => (
  <>
    <DashboardHeader />
    <RegimeBanner />
    <SectionToDoToday onAssetClick={onAssetClick} />
    <YourMoney />
    <Timeline />
  </>
);

// ============================================================
// PAGE — AUJOURD'HUI (alertes du jour)
// ============================================================
const AlertRow = ({ alert, onClick, isLast }) => {
  const isFlash = alert.kind === "FLASH_DROP";
  const isOverbought = alert.kind.includes("OVERBOUGHT");
  let dotColor = T.inkTertiary;
  if (isFlash) dotColor = T.burgundy;
  else if (isOverbought) dotColor = T.amber;

  return (
    <div onClick={onClick} style={{
      padding: "14px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      transition: "background-color 200ms",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.bgHover}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0,
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
          fontFamily: FONT_SANS, fontSize: 12.5, color: T.inkSecondary, fontWeight: 500,
        }}>{alertKindLabel(alert.kind)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700,
          color: T.inkPrimary, letterSpacing: "-0.01em",
        }}>{fmtUsd(alert.price)}</div>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 11, color: T.inkTertiary,
          marginTop: 2, fontWeight: 600,
        }}>score {Math.round(alert.score)}</div>
      </div>
      <ChevronRight size={16} strokeWidth={2} color={T.inkTertiary} style={{ flexShrink: 0 }} />
    </div>
  );
};

const TodayPage = ({ onAssetClick }) => {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    if (filter === "flash") return ALERTS_TODAY.filter(a => a.kind === "FLASH_DROP");
    if (filter === "overbought") return ALERTS_TODAY.filter(a => a.kind.includes("OVERBOUGHT"));
    return ALERTS_TODAY;
  }, [filter]);

  const flashCount = ALERTS_TODAY.filter(a => a.kind === "FLASH_DROP").length;
  const overboughtCount = ALERTS_TODAY.filter(a => a.kind.includes("OVERBOUGHT")).length;

  return (
    <>
      <PageHeader
        eyebrow="Aujourd'hui"
        title={`${ALERTS_TODAY.length} alertes`}
        subtitle="Signaux détectés sur les dernières 24 heures"
      />
      <div style={{
        padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto",
      }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={ALERTS_TODAY.length}>
          Toutes
        </FilterChip>
        <FilterChip active={filter === "flash"} onClick={() => setFilter("flash")} count={flashCount}>
          Chutes
        </FilterChip>
        <FilterChip active={filter === "overbought"} onClick={() => setFilter("overbought")} count={overboughtCount}>
          Tensions
        </FilterChip>
      </div>
      <div style={{
        margin: "0 20px", backgroundColor: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
      }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Sparkles} title="Aucune alerte"
            message="Rien à signaler dans cette catégorie pour le moment." />
        ) : (
          filtered.map((a, i) => (
            <AlertRow key={i} alert={a} isLast={i === filtered.length - 1}
              onClick={() => onAssetClick(a.ticker)} />
          ))
        )}
      </div>
      <div style={{ height: 32 }} />
    </>
  );
};

// ============================================================
// PAGE — ORDRES (paper + réels)
// ============================================================
const OrderRow = ({ order, onClick, isLast }) => {
  const distNeg = order.dist < 0;
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
        <Badge variant="soft" style={{ marginLeft: "auto" }}>EN ATTENTE</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 500,
          color: T.inkPrimary, letterSpacing: "-0.015em",
        }}>${fmtUsd(order.limit)}</span>
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
        Cours actuel ${fmtUsd(order.current)} · expire le {new Date(order.expires).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </div>
    </div>
  );
};

const OrdersPage = ({ onAssetClick }) => {
  const [filter, setFilter] = useState("pending");
  const grouped = useMemo(() => {
    const g = {};
    PAPER_ORDERS.forEach(o => {
      if (!g[o.ticker]) g[o.ticker] = [];
      g[o.ticker].push(o);
    });
    return g;
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Ordres"
        title={`${PAPER_ORDERS.length} en attente`}
        subtitle="Paper trading et ordres réels"
      />
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} count={PAPER_ORDERS.length}>
          En attente
        </FilterChip>
        <FilterChip active={filter === "filled"} onClick={() => setFilter("filled")} count={0}>
          Exécutés
        </FilterChip>
        <FilterChip active={filter === "expired"} onClick={() => setFilter("expired")} count={0}>
          Expirés
        </FilterChip>
      </div>
      {Object.entries(grouped).map(([ticker, orders]) => (
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
              }}>{orders.length} paliers · paper</span>
            </div>
            <ChevronRight size={14} strokeWidth={2} color={T.inkTertiary} />
          </div>
          <div style={{
            backgroundColor: T.bgSurface, border: `1px solid ${T.borderSubtle}`,
            borderRadius: 10, overflow: "hidden",
          }}>
            {orders.map((o, i) => (
              <OrderRow key={i} order={o} isLast={i === orders.length - 1}
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
const PositionRow = ({ position, onClick, isLast, viewMode }) => {
  const positive = position.pnlPct >= 0;
  if (viewMode === "list") {
    return (
      <div onClick={onClick} style={{
        padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
        display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
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
            }}>{position.name}</span>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 10.5, color: T.inkTertiary, marginTop: 2,
            fontWeight: 600, letterSpacing: "0.05em",
          }}>{position.account}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500,
            color: T.inkPrimary, letterSpacing: "-0.01em",
          }}>€{fmtEur(position.value)}</div>
          <MetricChip variant={positive ? "positive" : "negative"} style={{ marginTop: 3, fontSize: 11 }}>
            {positive ? "+" : ""}{position.pnlPct.toFixed(1)}%
          </MetricChip>
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
        <Badge variant="soft" style={{ fontSize: 8.5 }}>{position.account}</Badge>
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11, color: T.inkTertiary, fontWeight: 500,
        marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{position.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 500,
          color: T.inkPrimary, letterSpacing: "-0.01em" }}>
          €{fmtEur(position.value)}
        </div>
        <MetricChip variant={positive ? "positive" : "negative"} style={{ fontSize: 11.5 }}>
          {positive ? "+" : ""}{position.pnlPct.toFixed(1)}%
        </MetricChip>
      </div>
    </div>
  );
};

const PortfolioPage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [account, setAccount] = useState("all");
  const filtered = useMemo(() => {
    if (account === "all") return POSITIONS;
    return POSITIONS.filter(p => p.account === account);
  }, [account]);

  const totalValue = filtered.reduce((sum, p) => sum + p.value, 0);

  return (
    <>
      <PageHeader
        eyebrow="Portefeuille"
        title={`€${fmtEur(totalValue)}`}
        subtitle={`${filtered.length} positions${account !== "all" ? ` · ${account}` : ""}`}
        action={
          <SegmentedControl
            options={[
              { value: "list", label: "", icon: <List size={14} strokeWidth={2} /> },
              { value: "card", label: "", icon: <LayoutGrid size={14} strokeWidth={2} /> },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        }
      />
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={account === "all"} onClick={() => setAccount("all")}>Tous</FilterChip>
        {ACCOUNTS.map(a => (
          <FilterChip key={a.name} active={account === a.name} onClick={() => setAccount(a.name)}>
            {a.name}
          </FilterChip>
        ))}
      </div>
      {viewMode === "list" ? (
        <div style={{
          margin: "0 20px", backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
        }}>
          {filtered.map((p, i) => (
            <PositionRow key={i} position={p} viewMode="list"
              isLast={i === filtered.length - 1}
              onClick={() => onAssetClick(p.ticker)} />
          ))}
        </div>
      ) : (
        <div style={{
          margin: "0 20px", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {filtered.map((p, i) => (
            <PositionRow key={i} position={p} viewMode="card"
              onClick={() => onAssetClick(p.ticker)} />
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
const WatchlistRow = ({ item, onClick, isLast, viewMode }) => {
  const variant = stateVariant(item.state);

  if (viewMode === "card") {
    return (
      <div onClick={onClick} style={{
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
    </div>
  );
};

const WatchlistPage = ({ onAssetClick }) => {
  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    if (filter === "opportunities") return WATCHLIST.filter(w => w.state === "OPPORTUNITY_LIGHT" || w.state === "WATCH_BORDERLINE");
    if (filter === "held") return WATCHLIST.filter(w => w.isHeld);
    if (filter === "ultra") return WATCHLIST.filter(w => w.quality === "ULTRA_PREMIUM");
    return WATCHLIST;
  }, [filter]);

  const oppCount = WATCHLIST.filter(w => w.state === "OPPORTUNITY_LIGHT" || w.state === "WATCH_BORDERLINE").length;
  const heldCount = WATCHLIST.filter(w => w.isHeld).length;
  const ultraCount = WATCHLIST.filter(w => w.quality === "ULTRA_PREMIUM").length;

  return (
    <>
      <PageHeader
        eyebrow="Watchlist"
        title={`${WATCHLIST.length} actifs surveillés`}
        subtitle="Univers de qualité supérieure"
        action={
          <SegmentedControl
            options={[
              { value: "list", label: "", icon: <List size={14} strokeWidth={2} /> },
              { value: "card", label: "", icon: <LayoutGrid size={14} strokeWidth={2} /> },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        }
      />
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={WATCHLIST.length}>
          Tous
        </FilterChip>
        <FilterChip active={filter === "opportunities"} onClick={() => setFilter("opportunities")} count={oppCount}>
          Opportunités
        </FilterChip>
        <FilterChip active={filter === "held"} onClick={() => setFilter("held")} count={heldCount}>
          Détenus
        </FilterChip>
        <FilterChip active={filter === "ultra"} onClick={() => setFilter("ultra")} count={ultraCount}>
          Ultra premium
        </FilterChip>
      </div>
      {viewMode === "list" ? (
        <div style={{
          margin: "0 20px", backgroundColor: T.bgSurface,
          border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: "hidden",
        }}>
          {filtered.length === 0 ? (
            <EmptyState icon={Eye} title="Rien à surveiller" message="Aucun actif ne correspond à ce filtre." />
          ) : (
            filtered.map((w, i) => (
              <WatchlistRow key={i} item={w} viewMode="list"
                isLast={i === filtered.length - 1}
                onClick={() => onAssetClick(w.ticker)} />
            ))
          )}
        </div>
      ) : (
        <div style={{
          margin: "0 20px", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {filtered.map((w, i) => (
            <WatchlistRow key={i} item={w} viewMode="card"
              onClick={() => onAssetClick(w.ticker)} />
          ))}
        </div>
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
          }}>${fmtUsd(asset.currentPrice)}</span>
          <MetricChip variant={positive ? "positive" : "negative"}>
            {positive ? "+" : ""}{asset.chg1d.toFixed(2)}%
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

const AssetDetailPage = ({ ticker, onBack, onConfirmAll, onModifyClick }) => {
  const asset = ASSET_DETAIL;
  return (
    <>
      <DetailHeader asset={asset} onBack={onBack} />
      <DetailScoreCard asset={asset} />
      <ThesisCard asset={asset} />
      <PourContre asset={asset} />
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
export default function NexialApp() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [detailTicker, setDetailTicker] = useState(null);
  const showDetail = (ticker) => setDetailTicker(ticker);
  const closeDetail = () => setDetailTicker(null);

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
        <main style={{ flex: 1 }}>
          {detailTicker ? (
            <AssetDetailPage
              ticker={detailTicker}
              onBack={closeDetail}
              onConfirmAll={handleConfirmAll}
              onModifyClick={handleModifyClick}
            />
          ) : currentPage === "dashboard" ? (
            <DashboardPage onAssetClick={showDetail} />
          ) : currentPage === "today" ? (
            <TodayPage onAssetClick={showDetail} />
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
