'use client'

// Watchlist surface (P5 RESTORE FUNCTIONAL MASTER).
//
// Re-uses the existing hooks split from the legacy monolith:
//   - useWatchlists      (list + switcher)
//   - useWatchlistItems  (selected watchlist content)
// Adapts the legacy WatchlistPage / WatchlistItemRow visual pattern
// from nexial-app-complete.jsx into the unified AppShell V3.
//
// READ-ONLY restoration (Phase 1): switcher + filter chips + item
// rows. No add/remove asset, no create/delete watchlist, no detail
// page jump. The raw opportunity_score is intentionally NOT
// surfaced; we render the FR signal label and the useful badges
// (Zone d'achat, En portefeuille, Surchauffe…) instead.

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { useWatchlistItems, type WatchlistItem } from '@/lib/hooks/useWatchlistItems'
import { useWatchlists, type Watchlist } from '@/lib/hooks/useWatchlists'

type WatchlistFilter = 'all' | 'opportunities' | 'held' | 'watch'

const FILTER_LABEL: Record<WatchlistFilter, string> = {
  all: 'Tout',
  opportunities: 'Opportunités',
  held: 'Détenu',
  watch: 'Surveiller',
}

const SIGNAL_LABEL_FR: Record<string, string> = {
  BUY_ZONE: "Zone d'achat",
  BUY_ZONE_ENTERED: "Zone d'achat atteinte",
  HOT_PULLBACK: 'Repli après forte hausse',
  HOT_PULLBACK_ENTERED: 'Repli après forte hausse',
  WATCH_PULLBACK: 'Repli à surveiller',
  WATCH_PULLBACK_ENTERED: 'Repli à surveiller',
  WATCH_BORDERLINE: 'À surveiller',
  OVERBOUGHT_HOLD: 'Surchauffe technique',
  OPPORTUNITY_LIGHT: 'Opportunité',
  OPPORTUNITY_STRONG: 'Opportunité forte',
  NEUTRAL: 'Neutre',
  TOO_EXPENSIVE: 'Surcoté',
  INSUFFICIENT_DATA: 'Données insuffisantes',
  DOWNTREND_DANGER: 'Tendance baissière dangereuse',
}

function signalLabelFr(signal: string | null | undefined): string {
  if (!signal) return '—'
  return SIGNAL_LABEL_FR[signal] || signal.replace(/_/g, ' ').toLowerCase()
}

function isBuyZone(item: WatchlistItem): boolean {
  const price = Number(item.current_price ?? item.last_price ?? 0)
  const z1 = Number(item.z1_price ?? item.z1 ?? 0)
  return (
    item.has_buy_alert === true ||
    item.signal === 'BUY_ZONE' ||
    item.signal === 'BUY_ZONE_ENTERED' ||
    (price > 0 && z1 > 0 && price <= z1)
  )
}

function isHotPullback(item: WatchlistItem): boolean {
  return item.signal === 'HOT_PULLBACK' || item.signal === 'HOT_PULLBACK_ENTERED'
}

function isWatching(item: WatchlistItem): boolean {
  return (
    item.signal === 'WATCH_PULLBACK' ||
    item.signal === 'WATCH_PULLBACK_ENTERED' ||
    item.signal === 'WATCH_BORDERLINE'
  )
}

function pricePerformance(item: WatchlistItem): number | null {
  const perf = Number(item.perf_1d_pct ?? item.chg_24h_pct ?? NaN)
  return Number.isFinite(perf) ? perf : null
}

function priceDisplay(item: WatchlistItem): string {
  const price = Number(item.current_price ?? item.last_price ?? 0)
  if (!(price > 0)) return '—'
  const currency = (item.asset_currency || item.currency || 'EUR').toUpperCase()
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  const decimals = price >= 100 ? 2 : 3
  return `${price.toFixed(decimals)} ${symbol}`
}

function signalTone(item: WatchlistItem): string {
  if (isBuyZone(item) || isHotPullback(item)) return 'var(--forest-green)'
  if (isWatching(item)) return '#8B6914'
  if (item.signal === 'OVERBOUGHT_HOLD' || item.signal === 'TOO_EXPENSIVE') return '#8A4B0B'
  if (item.signal === 'DOWNTREND_DANGER') return 'var(--burgundy)'
  return 'var(--ink-secondary)'
}

interface ChipProps {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}

function FilterChip({ active, onClick, count, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: active ? 'var(--forest-green)' : 'var(--surface)',
        color: active ? '#FFFFFF' : 'var(--ink-secondary)',
        border: `1px solid ${active ? 'var(--forest-green)' : 'var(--border-subtle)'}`,
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{children}</span>
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          fontWeight: 700,
          opacity: 0.85,
        }}
      >
        {count}
      </span>
    </button>
  )
}

interface ItemRowProps {
  item: WatchlistItem
  isLast: boolean
}

function ItemRow({ item, isLast }: ItemRowProps) {
  const perf = pricePerformance(item)
  const perfColor = perf == null ? 'var(--ink-tertiary)' : perf >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'
  const stateColor = signalTone(item)
  const z2Distance = item.distance_to_z2_pct != null ? Number(item.distance_to_z2_pct) : null

  return (
    <div
      data-ticker={item.ticker}
      style={{
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
            }}
          >
            {item.asset_name || item.name || item.ticker}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-secondary)',
              letterSpacing: '0.03em',
            }}
          >
            {item.ticker}
            {item.sector ? ` · ${item.sector}` : ''}
          </span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              color: 'var(--ink-primary)',
            }}
          >
            {priceDisplay(item)}
          </span>
          {perf != null ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: perfColor,
              }}
            >
              {perf >= 0 ? '+' : ''}
              {perf.toFixed(2)} %
            </span>
          ) : null}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11,
            fontWeight: 700,
            color: stateColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {signalLabelFr(item.signal)}
        </span>
        {item.in_portfolio ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--forest-green)',
              border: '1px solid var(--forest-green)',
              borderRadius: 4,
              padding: '1px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            En portefeuille
          </span>
        ) : null}
        {z2Distance != null && Number.isFinite(z2Distance) ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-tertiary)',
            }}
          >
            {z2Distance >= 0 ? '+' : ''}
            {z2Distance.toFixed(1)} % de Z2
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface WatchlistSwitcherProps {
  watchlists: Watchlist[]
  activeId: string | null
  onSelect: (id: string) => void
}

function WatchlistSwitcher({ watchlists, activeId, onSelect }: WatchlistSwitcherProps) {
  if (watchlists.length <= 1) return null
  return (
    <select
      value={activeId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        minHeight: 40,
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        padding: '8px 10px',
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: 13,
        color: 'var(--ink-primary)',
        background: 'var(--surface)',
        width: '100%',
      }}
    >
      {watchlists.map((w) => (
        <option key={w.watchlist_id} value={w.watchlist_id}>
          {w.name}
          {w.items_count ? ` · ${w.items_count}` : ''}
        </option>
      ))}
    </select>
  )
}

export function WatchlistSurface() {
  const { watchlists, loading: wlLoading } = useWatchlists()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<WatchlistFilter>('all')

  useEffect(() => {
    if (!activeId && watchlists.length > 0) {
      const def = watchlists.find((w) => w.is_default) || watchlists[0]
      setActiveId(def.watchlist_id)
    }
  }, [watchlists, activeId])

  const { items, loading: itemsLoading, error } = useWatchlistItems(activeId)
  const activeWatchlist = useMemo(
    () => watchlists.find((w) => w.watchlist_id === activeId) ?? null,
    [watchlists, activeId],
  )

  const tagged = useMemo(() => {
    return (items ?? []).map((item) => ({
      item,
      isOpportunity: isBuyZone(item) || isHotPullback(item),
      isWatching: isWatching(item),
      isHeld: item.in_portfolio === true,
    }))
  }, [items])

  const counts = useMemo(
    () => ({
      all: tagged.length,
      opportunities: tagged.filter((t) => t.isOpportunity).length,
      held: tagged.filter((t) => t.isHeld).length,
      watch: tagged.filter((t) => t.isWatching).length,
    }),
    [tagged],
  )

  const filtered = useMemo(() => {
    const list = tagged.filter((t) => {
      if (filter === 'opportunities') return t.isOpportunity
      if (filter === 'held') return t.isHeld
      if (filter === 'watch') return t.isWatching
      return true
    })
    return list.map((t) => t.item)
  }, [tagged, filter])

  const isLoading = (wlLoading && watchlists.length === 0) || itemsLoading
  const subtitle = activeWatchlist
    ? activeWatchlist.description ||
      `${filtered.length} actif${filtered.length > 1 ? 's' : ''} ${
        filter === 'all' ? 'suivi' + (filtered.length > 1 ? 's' : '') : `· ${FILTER_LABEL[filter].toLowerCase()}`
      }`
    : 'Aucune watchlist active.'

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Surveillance"
        title="Watchlist"
        subtitle={subtitle}
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
        <WatchlistSwitcher
          watchlists={watchlists}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {(['all', 'opportunities', 'held', 'watch'] as WatchlistFilter[]).map((key) => (
            <FilterChip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
              count={counts[key]}
            >
              {FILTER_LABEL[key]}
            </FilterChip>
          ))}
        </div>

        {error ? (
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
                color: 'var(--ink-secondary)',
              }}
            >
              Certaines données n’ont pas pu être mises à jour.
            </p>
          </section>
        ) : isLoading ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-busy="true"
                style={{
                  height: 76,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : filtered.length === 0 ? (
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
              {filter === 'all'
                ? 'Aucun actif dans cette watchlist.'
                : `Aucun actif ${FILTER_LABEL[filter].toLowerCase()} pour le moment.`}
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
            {filtered.map((item, idx) => (
              <ItemRow
                key={item.item_id || `${item.watchlist_id}-${item.asset_id}`}
                item={item}
                isLast={idx === filtered.length - 1}
              />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  )
}
