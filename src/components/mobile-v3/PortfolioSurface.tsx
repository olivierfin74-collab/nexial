'use client'

// Portfolio mobile surface — outil compact, mobile-first.
// Mounts AppShell + MobileTopHeader (with MarketStatusBadge +
// DataFreshnessBadge in extras, identical to /dashboard).
// Pure render: no metier, no ranking, no recompute. Engine fields
// (score, suggested_action, top_alert_kind) are NOT surfaced.
//
// Visible accounts whitelisted on the frontend until backend exposes
// a proper is_active flag: PEA + main CTO IBKR only. Paper, Trade
// Republic, Boursorama CTO, IBKR Lab/FULL_AUTO and any future IBKR
// Nexial sub-account are hidden.

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { DataFreshnessBadge } from '@/components/shell/DataFreshnessBadge'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
  PortfolioCashAccount,
  PortfolioCashBreakdownPayload,
  PortfolioEnrichedPayload,
  PortfolioPosition,
} from '@/types/nexial-v3'

interface SurfaceState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const initial = <T,>(): SurfaceState<T> => ({ data: null, loading: true, error: null })

async function fetchEnvelope<T>(
  path: string,
  signal?: AbortSignal,
): Promise<SurfaceState<T>> {
  try {
    const res = await fetch(path, { cache: 'no-store', signal })
    const json = (await res.json()) as FetchEnvelope<T>
    if (!res.ok || json.error) {
      return { data: null, loading: false, error: json.error?.code ?? 'fetch_failed' }
    }
    return { data: json.data, loading: false, error: null }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null, loading: true, error: null }
    }
    return {
      data: null,
      loading: false,
      error: err instanceof Error ? err.message : 'fetch_failed',
    }
  }
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  return `${value.toFixed(2)} ${symbol}`
}

function formatPnlPct(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}

function formatEur(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
}

function formatSignedEur(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 4 })
}

function formatDayPct(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Jour —'
  const sign = value > 0 ? '+' : ''
  return `Jour ${sign}${value.toFixed(1).replace('.', ',')} %`
}

function positionKey(p: PortfolioPosition): string {
  return `${p.account.id}:${p.asset_id}`
}

// ─────────────────────────────────────────────────────────
// Frontend whitelist — until backend exposes is_active per
// account, we strictly limit visibility to PEA + main CTO
// IBKR. Sub-accounts (Lab FULL_AUTO, Nexial test) and other
// brokers (Trade Republic, Boursorama CTO, crypto, paper)
// are hidden.
// ─────────────────────────────────────────────────────────
function isAccountVisible(a: PortfolioCashAccount): boolean {
  const name = (a.name ?? '').toLowerCase()
  const broker = (a.broker ?? '').toLowerCase()
  if (a.kind === 'crypto') return false
  if (name.includes('paper')) return false
  if (name.includes('trade republic')) return false
  if (a.kind === 'pea') return true
  if (a.kind === 'cto' && broker === 'ibkr') {
    if (name.includes('lab') || name.includes('full_auto') || name.includes('full auto')) {
      return false
    }
    if (name.includes('nexial')) return false
    return true
  }
  return false
}

type ChipKey = 'all' | 'pea' | 'ibkr' | 'winners' | 'watch'

interface ChipDef {
  key: ChipKey
  label: string
  count: number
}

// ─────────────────────────────────────────────────────────
// MoneyBar — bande compacte plate, 3 colonnes
// Investi · Disponible · Total + détail compact par compte.
// ─────────────────────────────────────────────────────────
interface MoneyBarProps {
  scopeLabel: string
  investedDisplay?: string
  availableDisplay?: string
  totalDisplay?: string
  loading: boolean
  open: boolean
  onToggle: () => void
  accounts: PortfolioCashAccount[]
}

function MoneyBar({
  scopeLabel,
  investedDisplay,
  availableDisplay,
  totalDisplay,
  loading,
  open,
  onToggle,
  accounts,
}: MoneyBarProps) {
  const eyebrow: React.CSSProperties = {
    fontFamily: 'var(--font-editorial-sans)',
    fontSize: 9,
    color: 'var(--forest-green-pale)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 3,
  }
  const value: React.CSSProperties = {
    fontFamily: 'var(--font-editorial-mono)',
    fontSize: 16,
    fontWeight: 600,
    color: '#FFFFFF',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  }
  const divider: React.CSSProperties = {
    width: 1,
    background: 'rgba(168,196,176,0.22)',
    alignSelf: 'stretch',
  }
  return (
    <section
      data-card="money-bar"
      style={{
        background: 'var(--forest-deep)',
        border: '1px solid #15321F',
        borderRadius: 12,
        padding: '12px 14px',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <div
        style={{
          marginBottom: 10,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--forest-green-pale)',
          letterSpacing: '0.02em',
        }}
      >
        {scopeLabel}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow}>Investi</div>
          <div style={value}>{loading ? '…' : (investedDisplay ?? '—')}</div>
        </div>
        <div style={divider} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow}>Disponible</div>
          <div style={value}>{loading ? '…' : (availableDisplay ?? '—')}</div>
        </div>
        <div style={divider} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow}>Total</div>
          <div style={value}>{loading ? '…' : (totalDisplay ?? '—')}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(168,196,176,0.18)',
          background: 'transparent',
          border: 'none',
          borderTopColor: 'rgba(168,196,176,0.18)',
          borderTopStyle: 'solid',
          borderTopWidth: 1,
          color: '#FFFFFF',
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 0 0',
        }}
      >
        <span style={{ color: 'var(--forest-green-pale)' }}>
          {accounts.length} compte{accounts.length > 1 ? 's' : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {open ? 'Masquer' : 'Détail'}
          <ChevronDown
            size={14}
            aria-hidden
            style={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 180ms',
            }}
          />
        </span>
      </button>

      {open ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '10px 0 2px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {accounts.length === 0 ? (
            <li
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--forest-green-pale)',
              }}
            >
              Aucun compte rattaché.
            </li>
          ) : (
            accounts.map((a) => (
              <li
                key={a.account_id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(168,196,176,0.14)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.name}
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  <span style={detailMetric}>
                    <span style={detailLabel}>Investi</span>
                    <span>{a.invested_display}</span>
                  </span>
                  <span style={detailMetric}>
                    <span style={detailLabel}>Disponible</span>
                    <span>{a.cash_display}</span>
                  </span>
                  <span style={detailMetric}>
                    <span style={detailLabel}>Total</span>
                    <span>{formatEur(a.total_eur ?? 0)}</span>
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// MoneyBar detail metrics.
// ─────────────────────────────────────────────────────────
const detailMetric: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: '#FFFFFF',
  whiteSpace: 'nowrap',
}

const detailLabel: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 9,
  color: 'var(--forest-green-pale)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

// ─────────────────────────────────────────────────────────
// FilterChip — chips visibles, sélection unique
// ─────────────────────────────────────────────────────────
interface ChipProps {
  active: boolean
  label: string
  count: number
  onClick: () => void
}

function Chip({ active, label, count, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flexShrink: 0,
        padding: '6px 12px',
        borderRadius: 999,
        border: active ? '1px solid var(--ink-primary)' : '1px solid var(--border-subtle)',
        background: active ? 'var(--ink-primary)' : 'transparent',
        color: active ? 'var(--ink-on-dark, #FFFFFF)' : 'var(--ink-secondary)',
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          color: active ? 'rgba(255,255,255,0.85)' : 'var(--ink-tertiary)',
        }}
      >
        {count}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// AddMenu — CTA discret, UX only (pas d'écriture backend
// pour P10-R1, les 2 actions sont désactivées avec une
// indication "Bientôt").
// ─────────────────────────────────────────────────────────
function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid var(--border-subtle)',
    fontFamily: 'var(--font-editorial-sans)',
    fontSize: 13,
    color: 'var(--ink-secondary)',
  }
  const hint: React.CSSProperties = {
    fontFamily: 'var(--font-editorial-mono)',
    fontSize: 10,
    color: 'var(--ink-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }
  return (
    <section
      data-card="add-menu"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink-primary)',
          }}
        >
          Ajouter une position
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Fermer
        </button>
      </header>
      <div style={row} aria-disabled="true">
        <span>Enregistrer un achat exécuté</span>
        <span style={hint}>Bientôt</span>
      </div>
      <div style={row} aria-disabled="true">
        <span>Créer un ordre dans Orders</span>
        <span style={hint}>Bientôt</span>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Surface
// ─────────────────────────────────────────────────────────
export function PortfolioSurface() {
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cashBreakdown, setCashBreakdown] =
    useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)
  const [portfolio, setPortfolio] = useState<SurfaceState<PortfolioEnrichedPayload>>(initial)
  const [moneyOpen, setMoneyOpen] = useState(false)
  const [chip, setChip] = useState<ChipKey>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [pnlPctVisible, setPnlPctVisible] = useState<Set<string>>(new Set())

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<DashboardHeaderPayload>('/api/mobile/dashboard-header', ctrl.signal),
      fetchEnvelope<PortfolioCashBreakdownPayload>(
        '/api/mobile/portfolio-cash-breakdown',
        ctrl.signal,
      ),
      fetchEnvelope<PortfolioEnrichedPayload>(
        '/api/mobile/portfolio-enriched',
        ctrl.signal,
      ),
    ]).then(([h, c, p]) => {
      if (cancelled) return
      setHeader(h)
      setCashBreakdown(c)
      setPortfolio(p)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [refreshTick])

  const market = header.data?.market
  const freshness = header.data?.data_freshness
  const patrimoine = header.data?.patrimoine

  const visibleAccounts = useMemo(() => {
    const list = (cashBreakdown.data?.accounts ?? []).filter(isAccountVisible)
    return [...list].sort((a, b) => (b.total_eur ?? 0) - (a.total_eur ?? 0))
  }, [cashBreakdown.data?.accounts])
  const allCashAccounts = useMemo(() => {
    const list = cashBreakdown.data?.accounts ?? []
    return [...list].sort((a, b) => (b.total_eur ?? 0) - (a.total_eur ?? 0))
  }, [cashBreakdown.data?.accounts])
  const visibleAccountIds = useMemo(
    () => new Set(visibleAccounts.map((a) => a.account_id)),
    [visibleAccounts],
  )

  const cashScope = useMemo(() => {
    const accounts =
      chip === 'pea'
        ? allCashAccounts.filter((a) => a.kind === 'pea')
        : chip === 'ibkr'
          ? allCashAccounts.filter(
            (a) => a.kind === 'cto' && (a.broker ?? '').toLowerCase() === 'ibkr',
          )
          : allCashAccounts
    const invested = accounts.reduce((acc, a) => acc + (a.invested_eur ?? 0), 0)
    const available = accounts.reduce((acc, a) => acc + (a.cash_eur ?? 0), 0)
    const total = accounts.reduce((acc, a) => acc + (a.total_eur ?? 0), 0)
    return {
      label: chip === 'pea' ? 'PEA' : chip === 'ibkr' ? 'CTO IBKR' : 'Tous comptes',
      accounts,
      investedDisplay: formatEur(invested),
      availableDisplay: formatEur(available),
      totalDisplay: formatEur(total),
    }
  }, [allCashAccounts, chip])

  const visiblePositions = useMemo(() => {
    const list = (portfolio.data?.positions ?? []).filter(
      (p) => p.account?.id && visibleAccountIds.has(p.account.id),
    )
    return [...list].sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0))
  }, [portfolio.data?.positions, visibleAccountIds])

  const chips: ChipDef[] = useMemo(() => {
    const peaIds = new Set(
      visibleAccounts.filter((a) => a.kind === 'pea').map((a) => a.account_id),
    )
    const ibkrIds = new Set(
      visibleAccounts
        .filter((a) => a.kind === 'cto' && (a.broker ?? '').toLowerCase() === 'ibkr')
        .map((a) => a.account_id),
    )
    const pea = visiblePositions.filter((p) => peaIds.has(p.account.id)).length
    const ibkr = visiblePositions.filter((p) => ibkrIds.has(p.account.id)).length
    const winners = visiblePositions.filter(
      (p) => (p.unrealized_pnl_pct ?? 0) > 0,
    ).length
    const watch = visiblePositions.filter(
      (p) => (p.active_alerts_count ?? 0) > 0,
    ).length
    return [
      { key: 'all', label: 'Tous', count: visiblePositions.length },
      { key: 'pea', label: 'PEA', count: pea },
      { key: 'ibkr', label: 'IBKR', count: ibkr },
      { key: 'winners', label: 'Gagnants', count: winners },
      { key: 'watch', label: 'Surveillance', count: watch },
    ]
  }, [visibleAccounts, visiblePositions])

  const filteredPositions = useMemo(() => {
    if (chip === 'all') return visiblePositions
    if (chip === 'pea') {
      const peaIds = new Set(
        visibleAccounts.filter((a) => a.kind === 'pea').map((a) => a.account_id),
      )
      return visiblePositions.filter((p) => peaIds.has(p.account.id))
    }
    if (chip === 'ibkr') {
      const ibkrIds = new Set(
        visibleAccounts
          .filter((a) => a.kind === 'cto' && (a.broker ?? '').toLowerCase() === 'ibkr')
          .map((a) => a.account_id),
      )
      return visiblePositions.filter((p) => ibkrIds.has(p.account.id))
    }
    if (chip === 'winners') {
      return visiblePositions.filter((p) => (p.unrealized_pnl_pct ?? 0) > 0)
    }
    if (chip === 'watch') {
      return visiblePositions.filter((p) => (p.active_alerts_count ?? 0) > 0)
    }
    return visiblePositions
  }, [chip, visiblePositions, visibleAccounts])

  const groupedByAccount = useMemo(() => {
    const order = visibleAccounts.map((a) => a.account_id)
    const map = new Map<string, { account: PortfolioCashAccount; positions: PortfolioPosition[] }>()
    for (const a of visibleAccounts) {
      map.set(a.account_id, { account: a, positions: [] })
    }
    for (const p of filteredPositions) {
      const id = p.account?.id
      if (!id || !map.has(id)) continue
      map.get(id)!.positions.push(p)
    }
    return order
      .map((id) => map.get(id)!)
      .filter((g) => g.positions.length > 0)
  }, [filteredPositions, visibleAccounts])

  const marketExtras =
    market || freshness ? (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
        }}
      >
        {market ? (
          <MarketStatusBadge
            euOpen={market.eu_open}
            usOpen={market.us_open}
            regimeLabelFr={market.regime_label_fr}
          />
        ) : null}
        {freshness && freshness.label_fr ? (
          <DataFreshnessBadge status={freshness.status} labelFr={freshness.label_fr} />
        ) : null}
      </div>
    ) : null

  const isLoading = header.loading || cashBreakdown.loading || portfolio.loading
  const totalErrors = [header.error, cashBreakdown.error, portfolio.error].filter(Boolean).length
  const allFailed = totalErrors === 3

  const contextLine =
    !isLoading && visiblePositions.length > 0
      ? `${visiblePositions.length} position${visiblePositions.length > 1 ? 's' : ''} · ${visibleAccounts.length} compte${visibleAccounts.length > 1 ? 's' : ''}`
      : undefined

  const refresh = () => setRefreshTick((t) => t + 1)

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Patrimoine"
        title={patrimoine?.display ?? 'Portefeuille'}
        contextLine={contextLine}
        extras={marketExtras}
        compact
      />

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <MoneyBar
          scopeLabel={cashScope.label}
          investedDisplay={cashScope.investedDisplay}
          availableDisplay={cashScope.availableDisplay}
          totalDisplay={cashScope.totalDisplay}
          loading={cashBreakdown.loading && !cashBreakdown.data}
          open={moneyOpen}
          onToggle={() => setMoneyOpen((v) => !v)}
          accounts={cashScope.accounts}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            aria-expanded={addOpen}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            Ajouter
          </button>
          <button
            type="button"
            onClick={refresh}
            aria-label="Rafraîchir"
            disabled={isLoading}
            style={{
              padding: 7,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
              cursor: isLoading ? 'default' : 'pointer',
              color: 'var(--ink-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        <AddMenu open={addOpen} onClose={() => setAddOpen(false)} />

        <div
          role="tablist"
          aria-label="Filtres portefeuille"
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 2,
            margin: '0 -16px',
            padding: '2px 16px 4px',
          }}
        >
          {chips.map((c) => (
            <Chip
              key={c.key}
              active={chip === c.key}
              label={c.label}
              count={c.count}
              onClick={() => setChip(c.key)}
            />
          ))}
        </div>

        {isLoading && visiblePositions.length === 0 ? (
          <section
            aria-busy="true"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 56,
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : allFailed ? (
          <section
            role="status"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                color: 'var(--ink-primary)',
              }}
            >
              Impossible de charger le portefeuille.
            </p>
          </section>
        ) : groupedByAccount.length === 0 ? (
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                color: 'var(--ink-tertiary)',
              }}
            >
              {chip === 'all'
                ? 'Aucune position détenue actuellement.'
                : 'Aucune position pour ce filtre.'}
            </p>
          </section>
        ) : (
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {groupedByAccount.map((group, gIdx) => (
              <div
                key={group.account.account_id}
                data-account-group={group.account.kind}
                style={{ borderTop: gIdx === 0 ? 'none' : '1px solid var(--border-subtle)' }}
              >
                <header
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-editorial-mono)',
                      fontSize: 10,
                      color: 'var(--ink-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {group.account.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-editorial-mono)',
                      fontSize: 11,
                      color: 'var(--ink-tertiary)',
                    }}
                  >
                    {group.positions.length}
                  </span>
                </header>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {group.positions.map((p, idx) => {
                    const key = positionKey(p)
                    const showPct = pnlPctVisible.has(key)
                    const pnlPctColor =
                      (p.unrealized_pnl_pct ?? 0) >= 0
                        ? 'var(--forest-green)'
                        : 'var(--burgundy)'
                    const dayColor =
                      (p.perf_1d_pct ?? 0) >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'
                    return (
                      <li
                        key={key}
                        style={{
                          padding: '12px 14px',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-editorial-sans)',
                              fontSize: 14.5,
                              fontWeight: 650,
                              color: 'var(--ink-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            {p.asset_name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-editorial-mono)',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--ink-primary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatPrice(p.market_value, p.currency)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-editorial-mono)',
                              fontSize: 12,
                              color: 'var(--ink-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                            }}
                          >
                            {formatPrice(p.last_price, p.currency)} ·{' '}
                            <span style={{ color: dayColor }}>{formatDayPct(p.perf_1d_pct)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPnlPctVisible((prev) => {
                                const next = new Set(prev)
                                if (next.has(key)) next.delete(key)
                                else next.add(key)
                                return next
                              })
                            }}
                            style={{
                              border: `1px solid ${pnlPctColor}`,
                              background: 'transparent',
                              borderRadius: 999,
                              padding: '4px 9px',
                              fontFamily: 'var(--font-editorial-mono)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: pnlPctColor,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                          >
                            {showPct
                              ? formatPnlPct(p.unrealized_pnl_pct)
                              : formatSignedEur(p.unrealized_pnl)}
                          </button>
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-editorial-mono)',
                            fontSize: 11,
                            color: 'var(--ink-tertiary)',
                            letterSpacing: '0.03em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.ticker} · {formatQuantity(p.quantity)} · PRU{' '}
                          {formatPrice(p.pru, p.currency)}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  )
}
