'use client'

// Isolated sniper preview page — accessible only at
// /mobile-v3-preview/sniper. Not linked from /mobile, the bottom nav,
// or any production surface.
//
// Doctrine: this page answers "Quels actifs méritent une attention
// particulière maintenant ?", nothing more. No verdict, no score,
// no engine jargon, no scoring or ranking computed client-side.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PriceTargetModal, type PriceTargetModalValue } from '@/components/mobile-v3/PriceTargetModal'
import { SniperWatchCard } from '@/components/mobile-v3/SniperWatchCard'
import type {
  FetchEnvelope,
  MutationResult,
  SniperCard,
  SniperDashboardPayload,
  WatchLevel,
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

interface PriceModalState {
  open: boolean
  mode: 'create' | 'edit'
  sniper: SniperCard | null
}

const closedModal: PriceModalState = { open: false, mode: 'create', sniper: null }

interface EntryPlanState {
  open: boolean
  sniper: SniperCard | null
}

const closedEntry: EntryPlanState = { open: false, sniper: null }

export default function MobileV3SniperPreviewPage() {
  const [state, setState] = useState<SurfaceState<SniperDashboardPayload>>(initial)
  const [modal, setModal] = useState<PriceModalState>(closedModal)
  const [entry, setEntry] = useState<EntryPlanState>(closedEntry)
  const [saving, setSaving] = useState(false)
  const fetchSeq = useRef(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const seq = ++fetchSeq.current
    const next = await fetchEnvelope<SniperDashboardPayload>(
      '/api/mobile/sniper-dashboard',
      signal,
    )
    if (seq !== fetchSeq.current) return
    setState(next)
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const snipers = state.data?.snipers ?? []

  const { focus, watch } = useMemo(() => {
    const focusItems: SniperCard[] = []
    const watchItems: SniperCard[] = []
    for (const s of snipers) {
      if (s.watch_level === 'FOCUS') focusItems.push(s)
      else watchItems.push(s)
    }
    const sortFn = (a: SniperCard, b: SniperCard) => {
      const aHas = a.sniper_targets_count > 0 ? 0 : 1
      const bHas = b.sniper_targets_count > 0 ? 0 : 1
      if (aHas !== bHas) return aHas - bHas
      const aDist = Math.abs(a.signal?.distance_z2_pct ?? 999)
      const bDist = Math.abs(b.signal?.distance_z2_pct ?? 999)
      if (aDist !== bDist) return aDist - bDist
      return a.ticker.localeCompare(b.ticker)
    }
    focusItems.sort(sortFn)
    watchItems.sort(sortFn)
    return { focus: focusItems, watch: watchItems }
  }, [snipers])

  async function postJson(
    path: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<{ ok: boolean; result: MutationResult | null; errorDetail?: string }> {
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      })
      const json = (await res.json()) as FetchEnvelope<MutationResult>
      if (!res.ok || json.error) {
        return { ok: false, result: null, errorDetail: json.error?.code ?? `HTTP ${res.status}` }
      }
      return { ok: true, result: json.data }
    } catch (err) {
      return { ok: false, result: null, errorDetail: err instanceof Error ? err.message : 'fetch_failed' }
    }
  }

  const handleSetWatchLevel = useCallback(
    async (assetId: string, level: WatchLevel) => {
      if (saving) return
      setSaving(true)
      const r = await postJson('/api/mobile/sniper/watch-level', 'POST', {
        asset_id: assetId,
        watch_level: level,
      })
      setSaving(false)
      if (!r.ok) {
        toast.error('Action temporairement indisponible')
        return
      }
      const message =
        r.result?.message_fr ||
        (level === 'FOCUS'
          ? 'Surveillance rapprochée activée'
          : level === 'WATCH'
            ? 'Suivi normal activé'
            : 'Surveillance retirée')
      toast.success(message)
      await load()
    },
    [load, saving],
  )

  const openCreateTarget = useCallback((sniper: SniperCard) => {
    setModal({ open: true, mode: 'create', sniper })
  }, [])

  const openEditTarget = useCallback((sniper: SniperCard) => {
    setModal({ open: true, mode: 'edit', sniper })
  }, [])

  const closePriceModal = useCallback(() => {
    setModal(closedModal)
  }, [])

  const handlePriceSubmit = useCallback(
    async (value: PriceTargetModalValue) => {
      const sniper = modal.sniper
      if (!sniper) return
      setSaving(true)
      let r: { ok: boolean; result: MutationResult | null; errorDetail?: string }
      if (modal.mode === 'edit' && sniper.sniper_targets[0]) {
        const target = sniper.sniper_targets[0] as Record<string, unknown>
        const sniperId =
          typeof target.target_id === 'string'
            ? target.target_id
            : typeof target.sniper_id === 'string'
              ? target.sniper_id
              : null
        if (!sniperId) {
          setSaving(false)
          toast.error('Impossible de retrouver le prix cible')
          return
        }
        r = await postJson('/api/mobile/sniper/target', 'PATCH', {
          sniper_id: sniperId,
          target_price: value.target_price,
          target_quantity: value.target_quantity,
          target_amount_eur: value.target_amount_eur,
        })
      } else {
        r = await postJson('/api/mobile/sniper/target', 'POST', {
          asset_id: sniper.asset_id,
          target_price: value.target_price,
          target_quantity: value.target_quantity,
          target_amount_eur: value.target_amount_eur,
        })
      }
      setSaving(false)
      if (!r.ok) {
        toast.error('Action temporairement indisponible')
        return
      }
      toast.success(r.result?.message_fr || 'Prix cible enregistré')
      setModal(closedModal)
      await load()
    },
    [load, modal],
  )

  const handleViewEntryPlan = useCallback((sniper: SniperCard) => {
    setEntry({ open: true, sniper })
  }, [])

  const closeEntryPlan = useCallback(() => {
    setEntry(closedEntry)
  }, [])

  const isLoading = state.loading && !state.data
  const isError = !isLoading && !!state.error && !state.data
  const totalSnipers = snipers.length

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
          gap: 20,
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
            Preview v3.0.5
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
            Sniper
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              color: 'var(--ink-secondary)',
              lineHeight: 1.4,
            }}
          >
            Actifs à surveiller sans bruit inutile
          </p>
          {focus.length > 0 ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-tertiary)',
              }}
            >
              {focus.length} actif{focus.length > 1 ? 's' : ''} en surveillance rapprochée
            </p>
          ) : null}
        </header>

        {isError ? (
          <section
            role="status"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <p style={{ margin: 0, fontFamily: 'var(--font-editorial-sans)', fontSize: 13, color: 'var(--ink-primary)' }}>
              Impossible de charger la surveillance
            </p>
            <button
              type="button"
              onClick={() => load()}
              style={{
                alignSelf: 'flex-start',
                minHeight: 36,
                borderRadius: 8,
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--forest-green)',
                border: '1px solid var(--forest-green)',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          </section>
        ) : isLoading ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-busy="true"
                style={{
                  height: 88,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : (
          <>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-serif)',
                    fontSize: 18,
                    fontWeight: 500,
                    color: 'var(--ink-primary)',
                    letterSpacing: 'var(--tracking-display)',
                  }}
                >
                  Surveillance rapprochée
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  Actifs suivis de près
                </p>
              </header>

              {focus.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    color: 'var(--ink-tertiary)',
                    lineHeight: 1.4,
                  }}
                >
                  Aucun actif en surveillance rapprochée
                </p>
              ) : (
                focus.map((sniper) => (
                  <SniperWatchCard
                    key={sniper.asset_id}
                    sniper={sniper}
                    onSetWatchLevel={handleSetWatchLevel}
                    onDefineTarget={openCreateTarget}
                    onEditTarget={openEditTarget}
                    onViewEntryPlan={handleViewEntryPlan}
                  />
                ))
              )}
            </section>

            {watch.length > 0 ? (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-editorial-serif)',
                      fontSize: 17,
                      fontWeight: 500,
                      color: 'var(--ink-secondary)',
                      letterSpacing: 'var(--tracking-display)',
                    }}
                  >
                    Suivi normal
                  </h2>
                </header>

                {watch.map((sniper) => (
                  <SniperWatchCard
                    key={sniper.asset_id}
                    sniper={sniper}
                    muted
                    onSetWatchLevel={handleSetWatchLevel}
                    onDefineTarget={openCreateTarget}
                    onEditTarget={openEditTarget}
                    onViewEntryPlan={handleViewEntryPlan}
                  />
                ))}
              </section>
            ) : null}

            {totalSnipers === 0 ? (
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
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
                  Aucun actif surveillé actuellement
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  Commencer une surveillance se fera depuis la fiche d’un actif.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>

      <PriceTargetModal
        open={modal.open}
        ticker={modal.sniper?.ticker}
        currency={modal.sniper?.currency}
        suggestedPrice={modal.mode === 'create' ? (modal.sniper?.signal?.z2 ?? null) : null}
        initial={
          modal.mode === 'edit' && modal.sniper?.sniper_targets?.[0]
            ? {
                target_price: Number(
                  (modal.sniper.sniper_targets[0] as Record<string, unknown>).target_price,
                ),
              }
            : null
        }
        title={modal.mode === 'edit' ? 'Modifier le prix' : 'Définir un prix cible'}
        submitLabel={modal.mode === 'edit' ? 'Mettre à jour' : 'Enregistrer'}
        saving={saving}
        onClose={closePriceModal}
        onSubmit={handlePriceSubmit}
      />

      <EntryPlanPreview
        open={entry.open}
        sniper={entry.sniper}
        onClose={closeEntryPlan}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Lightweight inline entry-plan preview. Reads only fields already in
// the sniper payload — no extra fetch, no recommendation, no metier.
// ────────────────────────────────────────────────────────────────────
interface EntryPlanPreviewProps {
  open: boolean
  sniper: SniperCard | null
  onClose: () => void
}

function EntryPlanPreview({ open, sniper, onClose }: EntryPlanPreviewProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !sniper) return null

  const target = sniper.sniper_targets?.[0] as Record<string, unknown> | undefined
  const targetPrice =
    target && typeof target.target_price === 'number'
      ? (target.target_price as number)
      : null
  const amountEur =
    target && typeof target.target_amount_eur === 'number'
      ? (target.target_amount_eur as number)
      : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan d’entrée"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 18px 54px rgba(10,10,10,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Plan d’entrée
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {sniper.ticker} — Plan d’entrée
        </h2>

        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', margin: 0 }}>
          {targetPrice != null ? (
            <>
              <dt style={meta}>Prix cible</dt>
              <dd style={value}>
                {targetPrice} {sniper.currency}
              </dd>
            </>
          ) : null}
          {sniper.card_summary?.price_display ? (
            <>
              <dt style={meta}>Prix actuel</dt>
              <dd style={value}>{sniper.card_summary.price_display}</dd>
            </>
          ) : null}
          {sniper.card_summary?.distance_text ? (
            <>
              <dt style={meta}>Distance</dt>
              <dd style={value}>{sniper.card_summary.distance_text}</dd>
            </>
          ) : null}
          {amountEur != null ? (
            <>
              <dt style={meta}>Montant prévu</dt>
              <dd style={value}>{amountEur} EUR</dd>
            </>
          ) : null}
        </dl>

        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            color: 'var(--ink-secondary)',
            lineHeight: 1.45,
          }}
        >
          Attendre une zone intéressante. Cette page ne déclenche aucun ordre.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: 40,
              borderRadius: 8,
              padding: '8px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--forest-green)',
              color: '#FFFFFF',
              border: '1px solid var(--forest-green)',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

const meta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const value: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 13,
  color: 'var(--ink-primary)',
  margin: 0,
}
