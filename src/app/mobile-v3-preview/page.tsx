'use client'

// Isolated preview page for the v3 mobile contracts.
//
// This route is intentionally:
//   - NOT mounted on any bottom-nav tab
//   - NOT replacing /mobile or /aujourdhui
//   - NOT calling NexialApp or any legacy monolith
//
// It only fetches the four /api/mobile/* pass-through routes and renders
// the matching render-only cards from src/components/mobile-v3/. Used to
// validate the backend v3 contracts before any production wiring.

import { useEffect, useState } from 'react'
import { DecisionsToHandleCard } from '@/components/mobile-v3/DecisionsToHandleCard'
import { FocusOpportunityCard } from '@/components/mobile-v3/FocusOpportunityCard'
import { SniperSummaryCard } from '@/components/mobile-v3/SniperSummaryCard'
import { TodoListCard } from '@/components/mobile-v3/TodoListCard'
import type {
  DecisionsToHandlePayload,
  FetchEnvelope,
  FocusTodayPayload,
  SniperDashboardPayload,
  TodoListPayload,
} from '@/types/nexial-v3'

interface SurfaceState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const initialState = <T,>(): SurfaceState<T> => ({ data: null, loading: true, error: null })

async function fetchEnvelope<T>(path: string, signal?: AbortSignal): Promise<SurfaceState<T>> {
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

export default function MobileV3PreviewPage() {
  const [focus, setFocus] = useState<SurfaceState<FocusTodayPayload>>(initialState)
  const [decisions, setDecisions] = useState<SurfaceState<DecisionsToHandlePayload>>(initialState)
  const [snipers, setSnipers] = useState<SurfaceState<SniperDashboardPayload>>(initialState)
  const [todos, setTodos] = useState<SurfaceState<TodoListPayload>>(initialState)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<FocusTodayPayload>('/api/mobile/focus-today', ctrl.signal),
      fetchEnvelope<DecisionsToHandlePayload>('/api/mobile/decisions-to-handle', ctrl.signal),
      fetchEnvelope<SniperDashboardPayload>('/api/mobile/sniper-dashboard', ctrl.signal),
      fetchEnvelope<TodoListPayload>('/api/mobile/todo-list', ctrl.signal),
    ]).then(([f, d, s, t]) => {
      if (cancelled) return
      setFocus(f)
      setDecisions(d)
      setSnipers(s)
      setTodos(t)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const priorities = focus.data?.priorities ?? []

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FBF9F4',
        padding: '20px 16px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 10,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-eyebrow)',
            }}
          >
            Preview v3
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--forest-deep)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {focus.data?.title_fr ?? 'Focus du jour'}
          </h1>
          {focus.data?.market_context?.label_fr ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
              }}
            >
              {focus.data.market_context.label_fr}
              {focus.data.market_context.regime_label_fr
                ? ` · ${focus.data.market_context.regime_label_fr}`
                : ''}
            </p>
          ) : null}
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {focus.loading ? (
            <p
              aria-busy="true"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Chargement…
            </p>
          ) : focus.error ? (
            <p
              role="status"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
              }}
            >
              Certaines données n’ont pas pu être mises à jour.
            </p>
          ) : priorities.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Aucune priorité pour le moment.
            </p>
          ) : (
            priorities.map((item) => (
              <FocusOpportunityCard
                key={item.alert_id || item.asset_id || item.ticker}
                item={item}
              />
            ))
          )}
        </section>

        <DecisionsToHandleCard
          payload={decisions.data}
          loading={decisions.loading}
          error={decisions.error}
        />

        <SniperSummaryCard
          payload={snipers.data}
          loading={snipers.loading}
          error={snipers.error}
        />

        <TodoListCard payload={todos.data} loading={todos.loading} error={todos.error} />
      </div>
    </div>
  )
}
