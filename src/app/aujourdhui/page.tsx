'use client'

import { useMemo, useState } from 'react'
import { useSignalDashboard } from '@/hooks/useSignalDashboard'
import { SignalCard } from '@/components/SignalCard'

type FilterMode = 'all' | 'buy_zone' | 'in_portfolio'

const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'buy_zone', label: 'BUY ZONE' },
  { value: 'in_portfolio', label: 'En portefeuille' },
]

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const FILTER_LABEL_SUFFIX: Record<FilterMode, string> = {
  all: '',
  buy_zone: ' (filtre : BUY ZONE)',
  in_portfolio: ' (filtre : En portefeuille)',
}

export default function AujourdhuiPage() {
  const { signals, loading, error, refetch } = useSignalDashboard()
  const [filter, setFilter] = useState<FilterMode>('all')

  const filteredSignals = useMemo(() => {
    switch (filter) {
      case 'buy_zone':
        return signals.filter((s) => s.signal === 'BUY_ZONE')
      case 'in_portfolio':
        return signals.filter((s) => s.in_portfolio)
      default:
        return signals
    }
  }, [signals, filter])

  const todayLabel = useMemo(() => dateFormatter.format(new Date()), [])

  const count = filteredSignals.length
  const counterLine =
    count === 0
      ? ''
      : count === 1
        ? `1 signal affiché${FILTER_LABEL_SUFFIX[filter]}`
        : `${count} signaux affichés${FILTER_LABEL_SUFFIX[filter]}`

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
              Aujourd&apos;hui
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
              Nexial CIO
            </span>
          </div>
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

        {/* Loading skeleton (only on first load) */}
        {loading && signals.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  height: 256,
                }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
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
              ⚠ Impossible de charger les signaux.
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

        {/* Grid (signals) */}
        {!loading && !error && filteredSignals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSignals.map((signal) => (
              <SignalCard key={signal.asset_id} signal={signal} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredSignals.length === 0 && (
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
            {filter !== 'all'
              ? 'Aucun signal correspondant au filtre.'
              : 'Aucun signal disponible. Vérifier la fraîcheur des données.'}
          </div>
        )}
      </div>
    </div>
  )
}
