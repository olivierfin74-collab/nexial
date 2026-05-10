'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useActiveAlerts } from '@/hooks/useActiveAlerts'
import { AlertCard } from '@/components/AlertCard'
import type { AlertKind } from '@/types/nx'

type FilterMode = 'all' | AlertKind

const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'BUY_ZONE_ENTERED', label: 'BUY ZONE' },
  { value: 'HOT_PULLBACK_ENTERED', label: 'HOT PULLBACK' },
  { value: 'WATCH_PULLBACK_ENTERED', label: 'WATCH PULLBACK' },
]

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default function OpportunitesPage() {
  const { loading: userLoading } = useUser()
  const { alerts, loading: alertsLoading, error, refetch } = useActiveAlerts()
  const [filter, setFilter] = useState<FilterMode>('all')

  const loading = userLoading || alertsLoading

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts
    return alerts.filter((a) => a.alert_kind === filter)
  }, [alerts, filter])

  const todayLabel = useMemo(() => dateFormatter.format(new Date()), [])

  const activeCount = alerts.length
  const newCount = useMemo(
    () => alerts.filter((a) => a.status === 'NEW').length,
    [alerts],
  )

  const subtitle =
    activeCount === 0
      ? ''
      : `${activeCount} alerte${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''} · ${newCount} signal${newCount > 1 ? 'aux' : ''} décisionnel${newCount > 1 ? 's' : ''} en attente de validation`

  const filterCount = filteredAlerts.length
  const counterLine =
    filterCount === 0
      ? ''
      : filterCount === 1
        ? '1 alerte affichée'
        : `${filterCount} alertes affichées`

  return (
    <div
      className="-mx-6 -my-8 sm:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-12 py-8 md:py-12 min-h-screen"
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        fontFamily: 'var(--font-editorial-sans)',
      }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 md:mb-12">
          <div
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              marginBottom: 8,
            }}
          >
            {todayLabel}
          </div>
          <div className="flex flex-wrap items-baseline gap-4">
            <h1
              style={{
                fontFamily: 'var(--font-editorial-serif)',
                fontSize: 'clamp(32px, 6vw, 44px)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.015em',
                color: 'var(--ink-primary)',
                margin: 0,
              }}
            >
              Opportunités
            </h1>
            <span
              style={{
                display: 'inline-block',
                background: 'var(--pour-bg)',
                color: 'var(--forest-green)',
                padding: '4px 10px',
                borderRadius: 4,
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Nexial
            </span>
          </div>
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 14,
                color: 'var(--ink-secondary)',
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </header>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTERS.map(({ value, label }) => {
            const isActive = filter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className="transition-all duration-150"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--forest-green)' : 'var(--border-subtle)'}`,
                  background: isActive ? 'var(--forest-green)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--ink-secondary)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Counter */}
        {!loading && !error && counterLine && (
          <div
            className="mb-6"
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              color: 'var(--ink-muted)',
            }}
          >
            {counterLine}
          </div>
        )}

        {/* Loading skeleton (3 cards) */}
        {loading && alerts.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  height: 360,
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mx-auto max-w-md p-6 flex flex-col items-start gap-3"
            style={{
              background: 'var(--contre-bg)',
              border: '1px solid var(--burgundy)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-editorial-serif)',
                fontSize: 18,
                color: 'var(--burgundy)',
              }}
            >
              ⚠ Impossible de charger les alertes.
            </div>
            <code
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-secondary)',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </code>
            <button
              type="button"
              onClick={() => void refetch()}
              style={{
                background: 'var(--forest-green)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && filteredAlerts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Empty (filter has no match but alerts exist) */}
        {!loading && !error && filteredAlerts.length === 0 && alerts.length > 0 && (
          <div
            className="mx-auto max-w-md p-8 text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              color: 'var(--ink-muted)',
            }}
          >
            Aucune alerte correspondant au filtre.
          </div>
        )}

        {/* Empty (no alerts at all) */}
        {!loading && !error && alerts.length === 0 && (
          <div
            className="mx-auto max-w-md p-8 text-center flex flex-col gap-4 items-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              color: 'var(--ink-muted)',
            }}
          >
            <p style={{ margin: 0 }}>
              Aucune alerte active. Les signaux apparaissent ici dès que
              l&apos;Alert Engine détecte une opportunité.
            </p>
            <Link
              href="/aujourdhui"
              style={{
                display: 'inline-block',
                background: 'var(--forest-green)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: 6,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Voir tous les signaux du jour →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
