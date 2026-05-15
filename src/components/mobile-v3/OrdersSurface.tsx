'use client'

// Orders surface (V1 execution readability).
//
// Doctrine cible Orders : "Comment exécuter cette décision proprement ?"
// pas "Liste brute d'ordres". V1 read-only — pas de mutation, pas de
// cross-surface state, pas de calcul métier inventé (PRU impact, frais,
// probabilité chiffrée). On surface tout ce que fn_get_active_orders_for_user
// ship déjà et qu'on cachait : rationale (filtré jargon), montant total,
// limit_likely_hit en wording doux, distance_to_placed_pct, account_name.
//
// Sections (conditionnelles à non-vide) :
//   À poser manuellement   status ∈ {PENDING, PROPOSED, DRAFT}
//   En attente d'exécution status ∈ {PLACED, OPEN, WORKING, ACCEPTED}
//   Ordres actifs          fallback pour statuts non reconnus
//   Historique récent      FILLED/EXECUTED/DONE/EXPIRED/CANCELLED/CANCELED
//                          (5 items max côté front, pas de "Voir plus")
//
// Gap documenté V2 : asset_name_fr non disponible côté
// fn_get_active_orders_for_user ; enrichissement backend recommandé
// pour appliquer "nom action > ticker" comme sur les autres surfaces.

import { useMemo } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { useActiveOrders, type ActiveOrder } from '@/lib/hooks/useActiveOrders'

// ─────────────────────────────────────────────────────────
// Status bucketing
// ─────────────────────────────────────────────────────────
type OrderBucket = 'to_place' | 'placed' | 'active_unknown' | 'history'

const STATUS_TO_PLACE = new Set(['PENDING', 'PROPOSED', 'DRAFT'])
const STATUS_PLACED = new Set(['PLACED', 'OPEN', 'WORKING', 'ACCEPTED'])
const STATUS_FILLED = new Set(['FILLED', 'EXECUTED', 'DONE'])
const STATUS_EXPIRED = new Set(['EXPIRED'])
const STATUS_CANCELLED = new Set(['CANCELLED', 'CANCELED'])

function orderBucket(status: string | undefined): OrderBucket {
  const v = String(status ?? '').toUpperCase()
  if (STATUS_TO_PLACE.has(v)) return 'to_place'
  if (STATUS_PLACED.has(v)) return 'placed'
  if (STATUS_FILLED.has(v) || STATUS_EXPIRED.has(v) || STATUS_CANCELLED.has(v)) {
    return 'history'
  }
  return 'active_unknown'
}

function historyStatusLabel(status: string | undefined): string {
  const v = String(status ?? '').toUpperCase()
  if (STATUS_FILLED.has(v)) return 'Exécuté'
  if (STATUS_EXPIRED.has(v)) return 'Expiré'
  if (STATUS_CANCELLED.has(v)) return 'Annulé'
  return '—'
}

// ─────────────────────────────────────────────────────────
// Formatting helpers — fr-FR locale-aware.
// ─────────────────────────────────────────────────────────
function formatMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency || 'EUR'}`
  }
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value).toFixed(2).replace('.', ',')
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${abs} %`
}

function formatExpire(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(value)
}

// ─────────────────────────────────────────────────────────
// Rationale cleanup — hide the line entirely when the backend
// rationale leaks engine jargon (signal codes, RSI/MACD, Z1/Z2,
// SIGNAL_*, etc.). When clean, render verbatim with a 2-line
// ellipsis clamp.
// ─────────────────────────────────────────────────────────
const ENGINE_JARGON = new RegExp(
  '\\b(' +
    'BUY_ZONE|SELL_ZONE|STRONG_BUY|STRONG_SELL|' +
    'MACD|RSI|EMA|SMA|' +
    'SIGNAL_[A-Z_]+|' +
    'Z[12]_PRICE|Z[12]|' +
    'HOT_PULLBACK|WATCH_PULLBACK|WATCH_BORDERLINE|OVERBOUGHT_HOLD|TOO_EXPENSIVE|DOWNTREND_DANGER|' +
    'OPPORTUNITY_LIGHT|OPPORTUNITY_STRONG|NEUTRAL_HOLD|' +
    'BUY_SCORE|TRIGGER_[A-Z_]+|' +
    'score_now|technical_score' +
    ')\\b',
  'i',
)

function cleanRationale(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length < 2) return null
  if (ENGINE_JARGON.test(trimmed)) return null
  return trimmed
}

// ─────────────────────────────────────────────────────────
// limit_likely_hit — soft wording, never "probable" without
// backend confirmation. Hide when undefined / null.
// ─────────────────────────────────────────────────────────
type LimitHint = { label: string; color: string; bg: string } | null

function limitHint(value: boolean | undefined): LimitHint {
  if (value === true) {
    return {
      label: 'Proche du prix',
      color: 'var(--forest-green)',
      bg: 'rgba(45,107,31,0.08)',
    }
  }
  if (value === false) {
    return {
      label: 'Encore à distance',
      color: 'var(--ink-tertiary)',
      bg: 'rgba(0,0,0,0.03)',
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────
// Row components (inline — no new exported component).
// ─────────────────────────────────────────────────────────
interface ActiveRowProps {
  order: ActiveOrder
  isLast: boolean
}

function ActiveOrderRow({ order, isLast }: ActiveRowProps) {
  const currency = order.currency || 'EUR'
  const price = Number(order.effective_price ?? 0)
  const qty = Number(order.effective_quantity ?? 0)
  const totalRaw = Number(order.effective_amount ?? NaN)
  const total = Number.isFinite(totalRaw) ? totalRaw : price * qty

  const sideLabel = order.side === 'sell' ? 'Vente' : 'Achat'
  const typeLabel = (order.order_type || 'LIMIT').toUpperCase()
  const accountLabel = order.account_name || ''
  const expireLabel = order.expires_at ? `expire le ${formatExpire(order.expires_at)}` : ''
  const marketPriceNow = Number(order.market_price_now ?? NaN)
  const priceChange = Number(order.price_change_since_proposal_pct ?? NaN)
  const limit = limitHint(order.limit_likely_hit)
  const distance = Number(order.distance_to_placed_pct ?? NaN)
  const distanceLabel = Number.isFinite(distance)
    ? `À ${Math.abs(distance).toFixed(2).replace('.', ',')} % du palier`
    : null
  const rationale = cleanRationale(order.rationale)

  const metaParts = [
    `${sideLabel} ${typeLabel}`,
    accountLabel,
    expireLabel,
  ].filter(Boolean)

  return (
    <li
      data-order-id={order.id}
      data-status={order.status}
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
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
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink-primary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {order.ticker}
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
          {formatMoney(total, currency)}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 12,
          color: 'var(--ink-secondary)',
          lineHeight: 1.4,
        }}
      >
        {metaParts.join(' · ')}
      </p>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11.5,
          color: 'var(--ink-tertiary)',
          lineHeight: 1.4,
          letterSpacing: '0.02em',
        }}
      >
        {`${formatQty(qty)} × ${formatMoney(price, currency)}`}
        {Number.isFinite(marketPriceNow) && marketPriceNow > 0
          ? `  ·  Cours ${formatMoney(marketPriceNow, currency)}`
          : ''}
        {Number.isFinite(priceChange)
          ? `  (${formatPct(priceChange)})`
          : ''}
      </p>

      {limit || distanceLabel ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 2,
          }}
        >
          {limit ? (
            <span
              data-hint="limit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 9px',
                borderRadius: 999,
                background: limit.bg,
                border: `1px solid ${limit.color}`,
                color: limit.color,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              {limit.label}
            </span>
          ) : null}
          {distanceLabel ? (
            <span
              data-hint="distance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--ink-secondary)',
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {distanceLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {rationale ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginTop: 2,
          } as React.CSSProperties}
        >
          {rationale}
        </p>
      ) : null}
    </li>
  )
}

interface HistoryRowProps {
  order: ActiveOrder
  isLast: boolean
}

function HistoryOrderRow({ order, isLast }: HistoryRowProps) {
  const currency = order.currency || 'EUR'
  const price = Number(order.effective_price ?? 0)
  const qty = Number(order.effective_quantity ?? 0)
  const totalRaw = Number(order.effective_amount ?? NaN)
  const total = Number.isFinite(totalRaw) ? totalRaw : price * qty
  const sideLabel = order.side === 'sell' ? 'Vente' : 'Achat'
  const statusLabel = historyStatusLabel(order.status)
  const expireLabel = order.expires_at ? formatExpire(order.expires_at) : ''

  return (
    <li
      data-order-id={order.id}
      data-status={order.status}
      style={{
        padding: '10px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-primary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {order.ticker}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {statusLabel}
            {expireLabel ? ` · ${expireLabel}` : ''}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11,
            color: 'var(--ink-tertiary)',
            letterSpacing: '0.02em',
          }}
        >
          {sideLabel} {formatQty(qty)} × {formatMoney(price, currency)}
        </span>
      </span>
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 12.5,
          color: 'var(--ink-secondary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {formatMoney(total, currency)}
      </span>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// Surface
// ─────────────────────────────────────────────────────────
export function OrdersSurface() {
  const { orders, loading, error } = useActiveOrders()

  const sections = useMemo(() => {
    const items = orders ?? []
    const to_place: ActiveOrder[] = []
    const placed: ActiveOrder[] = []
    const active_unknown: ActiveOrder[] = []
    const history: ActiveOrder[] = []
    for (const o of items) {
      switch (orderBucket(o.status)) {
        case 'to_place':
          to_place.push(o)
          break
        case 'placed':
          placed.push(o)
          break
        case 'history':
          history.push(o)
          break
        default:
          active_unknown.push(o)
      }
    }
    return {
      to_place,
      placed,
      active_unknown,
      history: history.slice(0, 5),
    }
  }, [orders])

  const totalActive =
    sections.to_place.length + sections.placed.length + sections.active_unknown.length
  const contextLine =
    loading && !orders.length
      ? 'Chargement…'
      : totalActive > 0
        ? `Plan d’exécution · ${totalActive} ordre${totalActive > 1 ? 's' : ''} actif${totalActive > 1 ? 's' : ''}`
        : 'Plan d’exécution'

  const hasAnyContent =
    sections.to_place.length > 0 ||
    sections.placed.length > 0 ||
    sections.active_unknown.length > 0 ||
    sections.history.length > 0

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Exécution"
        title="Orders"
        contextLine={contextLine}
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
        ) : loading && !hasAnyContent ? (
          <section
            aria-busy="true"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  height: 110,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : !hasAnyContent ? (
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
              Aucun ordre pour le moment.
            </p>
          </section>
        ) : (
          <>
            {sections.to_place.length > 0 ? (
              <CollapsibleSection
                groupKey="orders-to-place"
                title="À poser manuellement"
                count={sections.to_place.length}
                subtitle="Ordres acceptés à placer chez le broker."
                defaultOpen
              >
                <ul style={listReset}>
                  {sections.to_place.map((o, idx) => (
                    <ActiveOrderRow
                      key={o.id}
                      order={o}
                      isLast={idx === sections.to_place.length - 1}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}

            {sections.placed.length > 0 ? (
              <CollapsibleSection
                groupKey="orders-placed"
                title="En attente d’exécution"
                count={sections.placed.length}
                subtitle="Ordres posés au broker, en attente d’exécution."
                defaultOpen
              >
                <ul style={listReset}>
                  {sections.placed.map((o, idx) => (
                    <ActiveOrderRow
                      key={o.id}
                      order={o}
                      isLast={idx === sections.placed.length - 1}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}

            {sections.active_unknown.length > 0 ? (
              <CollapsibleSection
                groupKey="orders-active"
                title="Ordres actifs"
                count={sections.active_unknown.length}
                subtitle="Ordres en cours."
                defaultOpen
              >
                <ul style={listReset}>
                  {sections.active_unknown.map((o, idx) => (
                    <ActiveOrderRow
                      key={o.id}
                      order={o}
                      isLast={idx === sections.active_unknown.length - 1}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}

            {sections.history.length > 0 ? (
              <CollapsibleSection
                groupKey="orders-history"
                title="Historique récent"
                count={sections.history.length}
                subtitle="Exécutés, expirés, annulés."
                defaultOpen={false}
              >
                <ul style={listReset}>
                  {sections.history.map((o, idx) => (
                    <HistoryOrderRow
                      key={o.id}
                      order={o}
                      isLast={idx === sections.history.length - 1}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  )
}

const listReset: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
}
