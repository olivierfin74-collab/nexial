'use client'

// Orders surface (P4 RESTORE FUNCTIONAL MASTER).
//
// Re-uses the existing useActiveOrders hook from
// @/lib/hooks/useActiveOrders (already split off the monolith) and
// adapts the legacy OrdersPage / OrderRow visual pattern from
// nexial-app-complete.jsx inside the unified AppShell V3.
//
// READ-ONLY restoration: filter chips + grouping by ticker + status
// row. No manual order creation, no edition, no execution dispatch.
// The full workflow stays in the legacy desktop monolith for now;
// this surface answers "où en sont mes ordres ?" in one screen.

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { useActiveOrders, type ActiveOrder } from '@/lib/hooks/useActiveOrders'

type OrderStatusKey = 'pending' | 'filled' | 'expired'

function orderStatusKey(status: string | undefined): OrderStatusKey {
  const value = String(status || '').toUpperCase()
  if (['FILLED', 'EXECUTED', 'DONE'].includes(value)) return 'filled'
  if (['EXPIRED', 'CANCELLED', 'CANCELED'].includes(value)) return 'expired'
  return 'pending'
}

const STATUS_LABEL: Record<OrderStatusKey, string> = {
  pending: 'En attente',
  filled: 'Exécuté',
  expired: 'Expiré',
}

const STATUS_COLOR: Record<OrderStatusKey, string> = {
  pending: 'var(--ink-secondary)',
  filled: 'var(--forest-green)',
  expired: '#8B6914',
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  return `${value.toFixed(2)} ${symbol}`
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} %`
}

function formatExpire(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
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

interface OrderRowProps {
  order: ActiveOrder
  status: OrderStatusKey
  isLast: boolean
}

function OrderRow({ order, status, isLast }: OrderRowProps) {
  const dist = Number(order.price_change_since_proposal_pct ?? 0)
  const distColor = dist < 0 ? 'var(--burgundy)' : 'var(--forest-green)'

  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 600,
          }}
        >
          {order.side === 'sell' ? 'Vente' : 'Achat'} · {order.order_type ?? 'limit'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11,
            fontWeight: 700,
            color: STATUS_COLOR[status],
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 18,
            color: 'var(--ink-primary)',
            fontWeight: 600,
          }}
        >
          {formatPrice(Number(order.effective_price ?? 0), order.currency || 'EUR')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11,
            color: 'var(--ink-tertiary)',
          }}
        >
          × {Number(order.effective_quantity ?? 0)}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: distColor,
          }}
        >
          {formatPct(dist)}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11,
          color: 'var(--ink-tertiary)',
          lineHeight: 1.4,
        }}
      >
        {order.market_price_now != null
          ? `Cours actuel ${formatPrice(Number(order.market_price_now), order.currency || 'EUR')}`
          : ''}
        {order.expires_at ? ` · expire le ${formatExpire(order.expires_at)}` : ''}
        {order.account_name ? ` · ${order.account_name}` : ''}
      </div>
    </div>
  )
}

interface GroupedOrders {
  ticker: string
  orders: ActiveOrder[]
}

export function OrdersSurface() {
  const [filterStatus, setFilterStatus] = useState<OrderStatusKey>('pending')
  const { orders, summary, loading, error } = useActiveOrders()

  const taggedOrders = useMemo(
    () => (orders || []).map((o) => ({ order: o, status: orderStatusKey(o.status) })),
    [orders],
  )

  const filteredOrders = useMemo(
    () => taggedOrders.filter((t) => t.status === filterStatus),
    [taggedOrders, filterStatus],
  )

  const grouped = useMemo<GroupedOrders[]>(() => {
    const map = new Map<string, ActiveOrder[]>()
    for (const { order } of filteredOrders) {
      if (!map.has(order.ticker)) map.set(order.ticker, [])
      map.get(order.ticker)!.push(order)
    }
    return Array.from(map.entries())
      .map(([ticker, list]) => ({ ticker, orders: list }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker))
  }, [filteredOrders])

  const counts = useMemo(() => {
    if (summary) {
      const pending = (summary.pending ?? 0) + (summary.placed ?? 0)
      return {
        pending,
        filled: summary.filled ?? 0,
        expired: summary.expired ?? 0,
      }
    }
    return {
      pending: taggedOrders.filter((t) => t.status === 'pending').length,
      filled: taggedOrders.filter((t) => t.status === 'filled').length,
      expired: taggedOrders.filter((t) => t.status === 'expired').length,
    }
  }, [summary, taggedOrders])

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Exécution"
        title="Orders"
        subtitle={
          loading
            ? 'Chargement…'
            : `${filteredOrders.length} ${
                filterStatus === 'pending'
                  ? `plan${filteredOrders.length > 1 ? 's' : ''} d’entrée à confirmer`
                  : filterStatus === 'filled'
                    ? 'exécutés'
                    : 'expirés'
              }`
        }
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
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <FilterChip
            active={filterStatus === 'pending'}
            onClick={() => setFilterStatus('pending')}
            count={counts.pending}
          >
            À confirmer
          </FilterChip>
          <FilterChip
            active={filterStatus === 'filled'}
            onClick={() => setFilterStatus('filled')}
            count={counts.filled}
          >
            Exécutés
          </FilterChip>
          <FilterChip
            active={filterStatus === 'expired'}
            onClick={() => setFilterStatus('expired')}
            count={counts.expired}
          >
            Expirés
          </FilterChip>
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
        ) : loading ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                aria-busy="true"
                style={{
                  height: 96,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : grouped.length === 0 ? (
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
              {filterStatus === 'pending'
                ? "Aucun plan d’entrée à confirmer."
                : filterStatus === 'filled'
                  ? 'Aucun ordre exécuté.'
                  : 'Aucun ordre expiré.'}
            </p>
          </section>
        ) : (
          grouped.map((group) => (
            <section
              key={group.ticker}
              data-ticker={group.ticker}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <header
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--canvas)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--ink-primary)',
                  }}
                >
                  {group.ticker}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 11,
                    color: 'var(--ink-tertiary)',
                  }}
                >
                  {group.orders.length} palier{group.orders.length > 1 ? 's' : ''}
                </span>
              </header>
              {group.orders.map((order, idx) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  status={orderStatusKey(order.status)}
                  isLast={idx === group.orders.length - 1}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </AppShell>
  )
}
