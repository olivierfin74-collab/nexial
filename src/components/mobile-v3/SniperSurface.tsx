'use client'

// Sniper surface — radar d'intentions fortes (V1).
//
// Doctrine produit : Sniper ne doit PAS devenir une watchlist
// générique ni une liste de bruit. Il porte les convictions et
// intentions fortes de l'utilisateur. La surface se réorganise
// en deux sections distinctes :
//
//   - Alertes simples     "Préviens-moi si X touche un prix"
//   - Sniper renforcé     "Je veux surveiller X sérieusement"
//                         (Opportunité d'achat ou Renfort détenu)
//
// Plus un bouton "+ Ajouter une intention" en tête qui ouvre un
// panel bottom-sheet local (3 étapes : actif → type → paramètres).
//
// V1 frontend-only : pas de nouveau RPC, pas de nouvelle route.
// Le type d'intention est encodé temporairement dans `thesis_md`
// préfixé par [simple_alert] / [opportunity] / [reinforcement].
// V2 backend doit ajouter un vrai field `intent_type` pour sortir
// de cette convention.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronRight, Plus, Search, X } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { PriceTargetModal, type PriceTargetModalValue } from '@/components/mobile-v3/PriceTargetModal'
import {
  useAssetSearch,
  type ExternalAssetResult,
  type InternalAssetResult,
} from '@/lib/hooks/useAssetSearch'
import type {
  FetchEnvelope,
  FocusAssetsListPayload,
  MutationResult,
  PortfolioEnrichedPayload,
  SniperCard,
  SniperDashboardPayload,
} from '@/types/nexial-v3'

// ─────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────
type IntentType = 'simple_alert' | 'opportunity' | 'reinforcement'

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

const INTENT_PREFIX = /^\s*\[(simple_alert|opportunity|reinforcement)\]\s*/i

function intentCodeFromThesis(thesis: string | null | undefined): IntentType | null {
  if (!thesis) return null
  const m = thesis.match(INTENT_PREFIX)
  if (!m) return null
  return m[1].toLowerCase() as IntentType
}

function cleanThesisComment(thesis: string | null | undefined): string {
  if (!thesis) return ''
  return thesis.replace(INTENT_PREFIX, '').trim()
}

function readTargetThesis(sniper: SniperCard): string | null {
  const target = sniper.sniper_targets?.[0] as Record<string, unknown> | undefined
  if (target && typeof target.thesis_md === 'string' && target.thesis_md.trim().length > 0) {
    return target.thesis_md
  }
  const conviction = sniper.conviction?.thesis_md
  if (typeof conviction === 'string' && conviction.trim().length > 0) {
    return conviction
  }
  return null
}

type Bucket = 'reinforce' | 'simple' | 'no_target'

function bucketOf(sniper: SniperCard): Bucket {
  if ((sniper.sniper_targets_count ?? 0) === 0) return 'no_target'
  const code = intentCodeFromThesis(readTargetThesis(sniper))
  if (code === 'opportunity' || code === 'reinforcement') return 'reinforce'
  if (code === 'simple_alert') return 'simple'
  // Fallback migration (no prefix) — FOCUS legacy → reinforce, else → simple
  if (sniper.watch_level === 'FOCUS') return 'reinforce'
  return 'simple'
}

function attentionLabel(code: IntentType | null): string {
  switch (code) {
    case 'opportunity':
      return 'Surveillance renforcée'
    case 'reinforcement':
      return 'Surveillance prioritaire'
    case 'simple_alert':
    default:
      return 'Surveillance légère'
  }
}

function intentDisplayLabel(code: IntentType | null, fallbackFocus: boolean): string {
  if (code === 'opportunity') return 'Opportunité d’achat'
  if (code === 'reinforcement') return 'Renfort de position'
  if (code === 'simple_alert') return 'Alerte simple'
  return fallbackFocus ? 'Opportunité d’achat' : 'Alerte simple'
}

function distanceLabel(distance_z2_pct: number | null | undefined): string | null {
  if (distance_z2_pct == null || !Number.isFinite(distance_z2_pct)) return null
  const abs = Math.abs(distance_z2_pct)
  if (abs < 1) return 'Dans la zone'
  if (abs < 3) return 'Proche zone'
  if (abs <= 10) return 'Approche'
  return 'Loin'
}

function distanceTone(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'neutral':
    default:
      return 'var(--ink-tertiary)'
  }
}

function formatMoney(value: number | null | undefined, currency: string | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
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

// ─────────────────────────────────────────────────────────
// Surface
// ─────────────────────────────────────────────────────────
interface IntentPanelState {
  step: 1 | 2 | 3
  selectedAsset: {
    asset_id: string
    ticker: string
    asset_name: string
    currency: string
  } | null
  intentType: IntentType | null
  targetPrice: string
  comment: string
}

const closedPanel: IntentPanelState = {
  step: 1,
  selectedAsset: null,
  intentType: null,
  targetPrice: '',
  comment: '',
}

interface EditModalState {
  open: boolean
  sniper: SniperCard | null
}

const closedEditModal: EditModalState = { open: false, sniper: null }

interface EntryPlanState {
  open: boolean
  sniper: SniperCard | null
}

const closedEntry: EntryPlanState = { open: false, sniper: null }

export function SniperSurface() {
  const [state, setState] = useState<SurfaceState<SniperDashboardPayload>>(initialState)
  const [focusList, setFocusList] = useState<SurfaceState<FocusAssetsListPayload>>(initialState)
  const [portfolio, setPortfolio] = useState<SurfaceState<PortfolioEnrichedPayload>>(initialState)
  const [intentPanel, setIntentPanel] = useState<IntentPanelState | null>(null)
  const [editModal, setEditModal] = useState<EditModalState>(closedEditModal)
  const [entry, setEntry] = useState<EntryPlanState>(closedEntry)
  const [pendingRemoval, setPendingRemoval] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const fetchSeq = useRef(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const seq = ++fetchSeq.current
    const [dashboard, focus, port] = await Promise.all([
      fetchEnvelope<SniperDashboardPayload>('/api/mobile/sniper-dashboard', signal),
      fetchEnvelope<FocusAssetsListPayload>('/api/mobile/focus-assets-list', signal),
      fetchEnvelope<PortfolioEnrichedPayload>('/api/mobile/portfolio-enriched', signal),
    ])
    if (seq !== fetchSeq.current) return
    setState(dashboard)
    setFocusList(focus)
    setPortfolio(port)
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const snipers = state.data?.snipers ?? []
  const focusAssetIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of focusList.data?.focus_assets ?? []) {
      if (a.asset_id) set.add(a.asset_id)
    }
    return set
  }, [focusList.data])

  const heldAssetIds = useMemo(() => {
    const set = new Set<string>()
    for (const p of portfolio.data?.positions ?? []) {
      if (p.asset_id) set.add(p.asset_id)
    }
    return set
  }, [portfolio.data])

  // Tag snipers with the authoritative FOCUS set, then bucket.
  const buckets = useMemo(() => {
    const reinforce: SniperCard[] = []
    const simple: SniperCard[] = []
    for (const s of snipers) {
      const tagged: SniperCard = focusAssetIds.has(s.asset_id)
        ? { ...s, watch_level: 'FOCUS' }
        : s.watch_level === 'FOCUS'
          ? { ...s, watch_level: 'WATCH' }
          : s
      const where = bucketOf(tagged)
      if (where === 'reinforce') reinforce.push(tagged)
      else if (where === 'simple') simple.push(tagged)
      // 'no_target' items intentionally hidden — V1 doctrine
      // "Sniper = intentions fortes, pas watchlist".
    }
    const sortFn = (a: SniperCard, b: SniperCard) => {
      const aDist = Math.abs(a.signal?.distance_z2_pct ?? 999)
      const bDist = Math.abs(b.signal?.distance_z2_pct ?? 999)
      if (aDist !== bDist) return aDist - bDist
      return a.ticker.localeCompare(b.ticker)
    }
    reinforce.sort(sortFn)
    simple.sort(sortFn)
    return { reinforce, simple }
  }, [snipers, focusAssetIds])

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
        return {
          ok: false,
          result: null,
          errorDetail: json.error?.code ?? `HTTP ${res.status}`,
        }
      }
      return { ok: true, result: json.data }
    } catch (err) {
      return {
        ok: false,
        result: null,
        errorDetail: err instanceof Error ? err.message : 'fetch_failed',
      }
    }
  }

  const handleOpenIntent = useCallback(() => {
    setIntentPanel({ ...closedPanel })
  }, [])

  const handleCloseIntent = useCallback(() => {
    setIntentPanel(null)
  }, [])

  const handleConfirmIntent = useCallback(async () => {
    if (!intentPanel?.selectedAsset || !intentPanel.intentType) return
    const priceNum = Number(intentPanel.targetPrice.replace(',', '.'))
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('Prix cible invalide')
      return
    }
    setSaving(true)
    const intentCode = intentPanel.intentType
    const commentClean = intentPanel.comment.trim()
    const thesis_md =
      commentClean.length > 0 ? `[${intentCode}] ${commentClean}` : `[${intentCode}]`
    const create = await postJson('/api/mobile/sniper/target', 'POST', {
      asset_id: intentPanel.selectedAsset.asset_id,
      target_price: priceNum,
      zone_label: 'Z2',
      thesis_md,
    })
    if (!create.ok) {
      setSaving(false)
      toast.error('Action temporairement indisponible')
      return
    }
    if (intentCode === 'opportunity' || intentCode === 'reinforcement') {
      await postJson('/api/mobile/sniper/watch-level', 'POST', {
        asset_id: intentPanel.selectedAsset.asset_id,
        watch_level: 'FOCUS',
      })
    }
    setSaving(false)
    toast.success(create.result?.message_fr || 'Intention enregistrée')
    setIntentPanel(null)
    await load()
  }, [intentPanel, load])

  const openEditTarget = useCallback((sniper: SniperCard) => {
    setEditModal({ open: true, sniper })
  }, [])

  const closeEditModal = useCallback(() => {
    setEditModal(closedEditModal)
  }, [])

  const handlePriceSubmit = useCallback(
    async (value: PriceTargetModalValue) => {
      const sniper = editModal.sniper
      if (!sniper) return
      setSaving(true)
      const target = sniper.sniper_targets?.[0] as Record<string, unknown> | undefined
      const sniperId =
        target && typeof target.target_id === 'string'
          ? target.target_id
          : target && typeof target.sniper_id === 'string'
            ? (target.sniper_id as string)
            : null
      if (!sniperId) {
        setSaving(false)
        toast.error('Impossible de retrouver le prix cible')
        return
      }
      const r = await postJson('/api/mobile/sniper/target', 'PATCH', {
        sniper_id: sniperId,
        target_price: value.target_price,
        target_quantity: value.target_quantity,
        target_amount_eur: value.target_amount_eur,
      })
      setSaving(false)
      if (!r.ok) {
        toast.error('Action temporairement indisponible')
        return
      }
      toast.success(r.result?.message_fr || 'Prix cible mis à jour')
      setEditModal(closedEditModal)
      await load()
    },
    [editModal, load],
  )

  const handleRequestRemoval = useCallback((sniperId: string) => {
    setPendingRemoval((prev) => {
      const next = new Set(prev)
      next.add(sniperId)
      return next
    })
  }, [])

  const handleCancelRemoval = useCallback((sniperId: string) => {
    setPendingRemoval((prev) => {
      if (!prev.has(sniperId)) return prev
      const next = new Set(prev)
      next.delete(sniperId)
      return next
    })
  }, [])

  const handleDeleteTarget = useCallback(
    async (sniperId: string) => {
      setSaving(true)
      const r = await postJson(`/api/mobile/sniper/target/${sniperId}`, 'DELETE')
      setSaving(false)
      if (!r.ok) {
        toast.error('Action temporairement indisponible')
        return
      }
      toast.success(r.result?.message_fr || 'Retiré')
      setPendingRemoval((prev) => {
        if (!prev.has(sniperId)) return prev
        const next = new Set(prev)
        next.delete(sniperId)
        return next
      })
      await load()
    },
    [load],
  )

  const handleViewEntryPlan = useCallback((sniper: SniperCard) => {
    setEntry({ open: true, sniper })
  }, [])

  const closeEntryPlan = useCallback(() => {
    setEntry(closedEntry)
  }, [])

  const isLoading = state.loading && !state.data
  const isError = !isLoading && !!state.error && !state.data
  const totalIntentions = buckets.reinforce.length + buckets.simple.length

  return (
    <AppShell>
      <MobileTopHeader
        title="Sniper"
        subtitle="Radar d’intentions fortes"
        contextLine={
          totalIntentions > 0
            ? `${totalIntentions} intention${totalIntentions > 1 ? 's' : ''} active${totalIntentions > 1 ? 's' : ''}`
            : undefined
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
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={handleOpenIntent}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 44,
            padding: '11px 14px',
            borderRadius: 10,
            border: '1px solid var(--forest-green)',
            background: 'transparent',
            color: 'var(--forest-green)',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} aria-hidden />
          Ajouter une intention
        </button>

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
            <p style={paragraph}>Impossible de charger le radar.</p>
            <button
              type="button"
              onClick={() => load()}
              style={secondaryButton}
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
                  height: 96,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : totalIntentions === 0 ? (
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 18,
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
              Aucune intention active.
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
                lineHeight: 1.45,
              }}
            >
              Le sniper porte vos convictions. Ajoutez une alerte simple ou une surveillance renforcée.
            </p>
          </section>
        ) : (
          <>
            <CollapsibleSection
              groupKey="sniper-reinforce"
              title="Sniper renforcé"
              count={buckets.reinforce.length || null}
              subtitle="Convictions et opportunités suivies de près."
              defaultOpen
            >
              {buckets.reinforce.length === 0 ? (
                <p style={paragraph}>Aucune conviction renforcée pour le moment.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {buckets.reinforce.map((s) => (
                    <SniperReinforceCard
                      key={s.asset_id}
                      sniper={s}
                      isHeld={heldAssetIds.has(s.asset_id)}
                      pendingRemoval={pendingRemoval.has(targetIdOf(s) || '')}
                      onEdit={() => openEditTarget(s)}
                      onViewEntryPlan={() => handleViewEntryPlan(s)}
                      onRequestRemoval={() => {
                        const id = targetIdOf(s)
                        if (id) handleRequestRemoval(id)
                      }}
                      onCancelRemoval={() => {
                        const id = targetIdOf(s)
                        if (id) handleCancelRemoval(id)
                      }}
                      onConfirmRemoval={() => {
                        const id = targetIdOf(s)
                        if (id) void handleDeleteTarget(id)
                      }}
                      saving={saving}
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              groupKey="sniper-simple"
              title="Alertes simples"
              count={buckets.simple.length || null}
              subtitle="Alertes prix discrètes."
              defaultOpen
            >
              {buckets.simple.length === 0 ? (
                <p style={paragraph}>Aucune alerte simple pour le moment.</p>
              ) : (
                <ul style={listReset}>
                  {buckets.simple.map((s, idx) => (
                    <SniperAlertRow
                      key={s.asset_id}
                      sniper={s}
                      isLast={idx === buckets.simple.length - 1}
                      onEdit={() => openEditTarget(s)}
                      onRemove={() => {
                        const id = targetIdOf(s)
                        if (id) void handleDeleteTarget(id)
                      }}
                      saving={saving}
                    />
                  ))}
                </ul>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>

      {intentPanel ? (
        <SniperIntentPanel
          state={intentPanel}
          onChange={setIntentPanel}
          onClose={handleCloseIntent}
          onConfirm={handleConfirmIntent}
          saving={saving}
          heldAssetIds={heldAssetIds}
        />
      ) : null}

      <PriceTargetModal
        open={editModal.open}
        ticker={editModal.sniper?.ticker}
        currency={editModal.sniper?.currency}
        suggestedPrice={null}
        initial={
          editModal.sniper?.sniper_targets?.[0]
            ? {
                target_price: Number(
                  (editModal.sniper.sniper_targets[0] as Record<string, unknown>)
                    .target_price,
                ),
              }
            : null
        }
        title="Modifier le prix"
        submitLabel="Mettre à jour"
        saving={saving}
        onClose={closeEditModal}
        onSubmit={handlePriceSubmit}
      />

      <EntryPlanPreview
        open={entry.open}
        sniper={entry.sniper}
        onClose={closeEntryPlan}
      />
    </AppShell>
  )
}

function targetIdOf(s: SniperCard): string | null {
  const target = s.sniper_targets?.[0] as Record<string, unknown> | undefined
  if (target && typeof target.target_id === 'string') return target.target_id
  if (target && typeof target.sniper_id === 'string') return target.sniper_id
  return null
}

// ─────────────────────────────────────────────────────────
// SniperReinforceCard — premium variant for "Sniper renforcé"
// ─────────────────────────────────────────────────────────
interface SniperReinforceCardProps {
  sniper: SniperCard
  isHeld: boolean
  pendingRemoval: boolean
  onEdit: () => void
  onViewEntryPlan: () => void
  onRequestRemoval: () => void
  onCancelRemoval: () => void
  onConfirmRemoval: () => void
  saving: boolean
}

function SniperReinforceCard({
  sniper,
  isHeld,
  pendingRemoval,
  onEdit,
  onViewEntryPlan,
  onRequestRemoval,
  onCancelRemoval,
  onConfirmRemoval,
  saving,
}: SniperReinforceCardProps) {
  const thesis = readTargetThesis(sniper)
  const intentCode = intentCodeFromThesis(thesis)
  const comment = cleanThesisComment(thesis)
  const target = sniper.sniper_targets?.[0] as Record<string, unknown> | undefined
  const targetPrice =
    target && typeof target.target_price === 'number' ? (target.target_price as number) : null
  const priceDisplay = sniper.card_summary?.price_display
  const distanceText = sniper.card_summary?.distance_text
  const distanceColor = sniper.card_summary?.color
  const dLabel = distanceLabel(sniper.signal?.distance_z2_pct ?? null)
  const accent = isHeld && intentCode === 'reinforcement' ? '#B8924A' : 'var(--forest-green)'
  const intentLabel = intentDisplayLabel(intentCode, sniper.watch_level === 'FOCUS')
  const showRenfortBadge =
    intentCode === 'reinforcement' && isHeld === true

  return (
    <article
      data-card="SniperReinforceCard"
      data-intent={intentCode ?? 'legacy_focus'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {pendingRemoval ? (
        <div
          data-confirm-remove="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '4px 0',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ink-primary)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Retirer ce sniper ?
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              color: 'var(--ink-secondary)',
              lineHeight: 1.4,
            }}
          >
            {sniper.asset_name} · {sniper.ticker}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onCancelRemoval}
              disabled={saving}
              style={{
                ...secondaryButton,
                minHeight: 38,
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirmRemoval}
              disabled={saving}
              style={{
                minHeight: 38,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--burgundy)',
                background: 'transparent',
                color: 'var(--burgundy)',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              Confirmer
            </button>
          </div>
        </div>
      ) : (
        <>
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-serif)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ink-primary)',
                  letterSpacing: 'var(--tracking-display)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sniper.asset_name}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--ink-tertiary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <span>{sniper.ticker}</span>
                <span>·</span>
                <span>{intentLabel}</span>
              </span>
            </span>
            {priceDisplay ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 13,
                  color: 'var(--ink-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {priceDisplay}
              </span>
            ) : null}
          </header>

          {showRenfortBadge ? (
            <span
              data-badge="renfort"
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(184,146,74,0.10)',
                border: '1px solid #B8924A',
                color: '#7E6533',
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Renfort détenu
            </span>
          ) : null}

          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(100px,auto) 1fr',
              rowGap: 5,
              columnGap: 12,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
            }}
          >
            {targetPrice != null ? (
              <>
                <dt style={meta}>Prix cible</dt>
                <dd style={{ ...value, justifySelf: 'end' }}>
                  {formatMoney(targetPrice, sniper.currency)}
                </dd>
              </>
            ) : null}
            {distanceText || dLabel ? (
              <>
                <dt style={meta}>Distance</dt>
                <dd style={{ ...value, justifySelf: 'end', color: distanceTone(distanceColor) }}>
                  {distanceText || dLabel}
                </dd>
              </>
            ) : null}
            <dt style={meta}>Attention</dt>
            <dd style={{ ...value, justifySelf: 'end' }}>{attentionLabel(intentCode)}</dd>
          </dl>

          {comment ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-serif)',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties}
            >
              {comment}
            </p>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 2,
            }}
          >
            <button
              type="button"
              onClick={onViewEntryPlan}
              style={{
                minHeight: 36,
                padding: '7px 12px',
                borderRadius: 8,
                border: `1px solid ${accent}`,
                background: 'transparent',
                color: accent,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Voir le plan d’entrée
            </button>
            <button
              type="button"
              onClick={onEdit}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--ink-secondary)',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
              }}
            >
              Modifier prix
            </button>
            <button
              type="button"
              onClick={onRequestRemoval}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--ink-tertiary)',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Retirer
            </button>
          </div>
        </>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────
// SniperAlertRow — compact row for "Alertes simples"
// ─────────────────────────────────────────────────────────
interface SniperAlertRowProps {
  sniper: SniperCard
  isLast: boolean
  onEdit: () => void
  onRemove: () => void
  saving: boolean
}

function SniperAlertRow({
  sniper,
  isLast,
  onEdit,
  onRemove,
  saving,
}: SniperAlertRowProps) {
  const target = sniper.sniper_targets?.[0] as Record<string, unknown> | undefined
  const targetPrice =
    target && typeof target.target_price === 'number' ? (target.target_price as number) : null
  const priceDisplay = sniper.card_summary?.price_display
  const distanceText = sniper.card_summary?.distance_text
  const distanceColor = sniper.card_summary?.color
  const dLabel = distanceLabel(sniper.signal?.distance_z2_pct ?? null)

  return (
    <li
      data-ticker={sniper.ticker}
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
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
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sniper.asset_name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 10.5,
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {sniper.ticker}
          </span>
        </span>
        {priceDisplay ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 12,
              color: 'var(--ink-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            {priceDisplay}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          color: 'var(--ink-tertiary)',
        }}
      >
        {targetPrice != null ? (
          <span>Cible {formatMoney(targetPrice, sniper.currency)}</span>
        ) : null}
        {distanceText || dLabel ? (
          <span style={{ color: distanceTone(distanceColor) }}>
            · {dLabel ?? distanceText}
          </span>
        ) : null}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12 }}>
          <button
            type="button"
            onClick={onEdit}
            style={alertLink}
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={saving}
            style={alertLink}
          >
            Retirer
          </button>
        </span>
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// SniperIntentPanel — bottom-sheet 3-step creation flow
// ─────────────────────────────────────────────────────────
interface SniperIntentPanelProps {
  state: IntentPanelState
  onChange: (next: IntentPanelState) => void
  onClose: () => void
  onConfirm: () => void
  saving: boolean
  heldAssetIds: Set<string>
}

function SniperIntentPanel({
  state,
  onChange,
  onClose,
  onConfirm,
  saving,
  heldAssetIds,
}: SniperIntentPanelProps) {
  const search = useAssetSearch()
  const [resolvingExternal, setResolvingExternal] = useState(false)

  const handleSelectInternal = useCallback(
    (a: InternalAssetResult) => {
      onChange({
        ...state,
        step: 2,
        selectedAsset: {
          asset_id: a.asset_id,
          ticker: a.ticker,
          asset_name: a.asset_name,
          currency: a.currency || 'EUR',
        },
      })
    },
    [onChange, state],
  )

  const handleSelectExternal = useCallback(
    async (a: ExternalAssetResult) => {
      setResolvingExternal(true)
      try {
        const asset_id = await search.createUserAsset(a)
        onChange({
          ...state,
          step: 2,
          selectedAsset: {
            asset_id,
            ticker: a.ticker,
            asset_name: a.asset_name,
            currency: a.currency || 'EUR',
          },
        })
      } catch {
        toast.error('Impossible d’ajouter cet actif')
      } finally {
        setResolvingExternal(false)
      }
    },
    [onChange, search, state],
  )

  const handlePickType = useCallback(
    (type: IntentType) => {
      onChange({ ...state, step: 3, intentType: type })
    },
    [onChange, state],
  )

  const canSubmit =
    !!state.selectedAsset &&
    !!state.intentType &&
    state.targetPrice.trim().length > 0 &&
    Number.isFinite(Number(state.targetPrice.replace(',', '.'))) &&
    Number(state.targetPrice.replace(',', '.')) > 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter une intention"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15,15,15,0.42)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--surface)',
          borderRadius: 14,
          boxShadow: '0 -12px 30px rgba(0,0,0,0.18)',
          padding: '18px 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 'env(safe-area-inset-bottom)',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 10,
              color: 'var(--ink-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}
          >
            Étape {state.step} / 3 · Ajouter une intention
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              color: 'var(--ink-tertiary)',
              cursor: 'pointer',
              lineHeight: 0,
            }}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        {state.step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={panelTitle}>Choisir l’actif</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '8px 12px',
                background: 'var(--canvas)',
              }}
            >
              <Search size={14} aria-hidden style={{ color: 'var(--ink-tertiary)' }} />
              <input
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                placeholder="Nom ou ticker (min. 2 caractères)"
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  color: 'var(--ink-primary)',
                }}
              />
            </div>
            {search.loading || resolvingExternal ? (
              <p style={paragraph}>Recherche…</p>
            ) : search.query.trim().length < 2 ? (
              <p style={paragraph}>Tapez au moins 2 caractères pour chercher.</p>
            ) : (
              <>
                {search.results.internal.length > 0 ? (
                  <ul style={listReset}>
                    {search.results.internal.map((a) => (
                      <li
                        key={`int:${a.asset_id}`}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectInternal(a)}
                          style={searchResultButton}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={searchResultName}>{a.asset_name}</span>
                            <span style={searchResultMeta}>
                              {a.ticker}
                              {a.sector ? ` · ${a.sector}` : ''}
                              {a.currency ? ` · ${a.currency}` : ''}
                            </span>
                          </span>
                          <ChevronRight
                            size={14}
                            aria-hidden
                            style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {search.results.external.length > 0 ? (
                  <>
                    <span
                      style={{
                        fontFamily: 'var(--font-editorial-mono)',
                        fontSize: 10,
                        color: 'var(--ink-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Autres sources
                    </span>
                    <ul style={listReset}>
                      {search.results.external.map((a) => (
                        <li
                          key={`ext:${a.ticker}-${a.exchange_mic ?? ''}`}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <button
                            type="button"
                            onClick={() => void handleSelectExternal(a)}
                            disabled={resolvingExternal}
                            style={searchResultButton}
                          >
                            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={searchResultName}>{a.asset_name}</span>
                              <span style={searchResultMeta}>
                                {a.ticker}
                                {a.exchange_region ? ` · ${a.exchange_region}` : ''}
                                {a.currency ? ` · ${a.currency}` : ''}
                              </span>
                            </span>
                            <ChevronRight
                              size={14}
                              aria-hidden
                              style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {search.results.internal.length === 0 &&
                search.results.external.length === 0 ? (
                  <p style={paragraph}>Aucun résultat.</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {state.step === 2 && state.selectedAsset ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => onChange({ ...state, step: 1, selectedAsset: null, intentType: null })}
              style={backLink}
            >
              ← Changer d’actif
            </button>
            <span style={panelTitle}>{state.selectedAsset.asset_name}</span>
            <span style={panelTickerMeta}>
              {state.selectedAsset.ticker} · {state.selectedAsset.currency}
            </span>
            <span
              style={{
                ...paragraph,
                marginTop: 4,
              }}
            >
              Quel type de surveillance ?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => handlePickType('simple_alert')}
                style={typeButton('simple_alert', state.intentType)}
              >
                <span style={typeButtonTitle}>Alerte simple</span>
                <span style={typeButtonSubtitle}>
                  Préviens-moi si le prix touche un niveau.
                </span>
              </button>
              <button
                type="button"
                onClick={() => handlePickType('opportunity')}
                style={typeButton('opportunity', state.intentType)}
              >
                <span style={typeButtonTitle}>Opportunité d’achat</span>
                <span style={typeButtonSubtitle}>
                  Surveiller activement avec stratégie.
                </span>
              </button>
              <button
                type="button"
                disabled={!heldAssetIds.has(state.selectedAsset.asset_id)}
                onClick={() => handlePickType('reinforcement')}
                style={{
                  ...typeButton('reinforcement', state.intentType),
                  opacity: heldAssetIds.has(state.selectedAsset.asset_id) ? 1 : 0.5,
                  cursor: heldAssetIds.has(state.selectedAsset.asset_id)
                    ? 'pointer'
                    : 'not-allowed',
                }}
              >
                <span style={typeButtonTitle}>Renfort de position</span>
                <span style={typeButtonSubtitle}>
                  {heldAssetIds.has(state.selectedAsset.asset_id)
                    ? 'Ajouter à ma position détenue.'
                    : 'Disponible uniquement si vous détenez l’actif.'}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {state.step === 3 && state.selectedAsset && state.intentType ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={() => onChange({ ...state, step: 2, intentType: null })}
              style={backLink}
            >
              ← Changer le type
            </button>
            <span style={panelTitle}>{state.selectedAsset.asset_name}</span>
            <span style={panelTickerMeta}>
              {state.selectedAsset.ticker} · {intentDisplayLabel(state.intentType, false)}
            </span>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginTop: 4,
              }}
            >
              <span style={panelMeta}>Prix cible</span>
              <input
                type="text"
                inputMode="decimal"
                value={state.targetPrice}
                onChange={(e) => onChange({ ...state, targetPrice: e.target.value })}
                placeholder={`p. ex. 172,00 ${state.selectedAsset.currency}`}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 14,
                  color: 'var(--ink-primary)',
                  background: 'var(--canvas)',
                }}
              />
            </label>

            {state.intentType !== 'simple_alert' ? (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={panelMeta}>
                  {state.intentType === 'reinforcement'
                    ? 'Pourquoi renforcer ?'
                    : 'Pourquoi cet actif ?'}{' '}
                  (optionnel)
                </span>
                <textarea
                  value={state.comment}
                  onChange={(e) => onChange({ ...state, comment: e.target.value })}
                  rows={2}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 13,
                    color: 'var(--ink-primary)',
                    background: 'var(--canvas)',
                    resize: 'vertical',
                  }}
                />
              </label>
            ) : null}

            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 11,
                color: 'var(--ink-tertiary)',
                lineHeight: 1.45,
              }}
            >
              Notification Telegram disponible si activée.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!canSubmit || saving}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--forest-green)',
                  background:
                    canSubmit && !saving ? 'var(--forest-green)' : 'rgba(45,107,31,0.4)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {saving ? 'Enregistrement…' : (
                  <>
                    <Check size={14} aria-hidden /> Confirmer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  ...secondaryButton,
                  minHeight: 44,
                  padding: '12px 14px',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// EntryPlanPreview — preserved from previous Sniper version
// ─────────────────────────────────────────────────────────
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
    target && typeof target.target_price === 'number' ? (target.target_price as number) : null
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
        <span style={panelEyebrow}>Plan d’entrée</span>
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
          {sniper.asset_name}
        </h2>
        <span style={panelTickerMeta}>{sniper.ticker}</span>

        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', margin: 0 }}>
          {targetPrice != null ? (
            <>
              <dt style={meta}>Prix cible</dt>
              <dd style={value}>{formatMoney(targetPrice, sniper.currency)}</dd>
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
              <dd style={value}>{formatMoney(amountEur, 'EUR')}</dd>
            </>
          ) : null}
          {sniper.position?.is_held && sniper.position.avg_cost != null ? (
            <>
              <dt style={meta}>PRU détenu</dt>
              <dd style={value}>{formatMoney(sniper.position.avg_cost, sniper.currency)}</dd>
            </>
          ) : null}
          {sniper.position?.pnl_pct != null ? (
            <>
              <dt style={meta}>P&amp;L</dt>
              <dd style={value}>{formatPct(sniper.position.pnl_pct)}</dd>
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

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const paragraph: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  lineHeight: 1.45,
}

const listReset: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
}

const meta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
  fontWeight: 500,
}

const value: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 13,
  color: 'var(--ink-primary)',
  margin: 0,
}

const secondaryButton: React.CSSProperties = {
  minHeight: 36,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const panelTitle: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  letterSpacing: 'var(--tracking-display)',
}

const panelEyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const panelTickerMeta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const panelMeta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
}

const alertLink: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11.5,
  fontWeight: 600,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  cursor: 'pointer',
  textTransform: 'none',
  letterSpacing: 'normal',
}

const backLink: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: 'var(--ink-tertiary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const searchResultButton: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  padding: '10px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  cursor: 'pointer',
  textAlign: 'left',
}

const searchResultName: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const searchResultMeta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.03em',
}

function typeButton(
  ownType: IntentType,
  currentType: IntentType | null,
): React.CSSProperties {
  const active = ownType === currentType
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-start',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${active ? 'var(--forest-green)' : 'var(--border-subtle)'}`,
    background: active ? 'rgba(45,107,31,0.06)' : 'var(--surface)',
    fontFamily: 'var(--font-editorial-sans)',
    cursor: 'pointer',
    textAlign: 'left',
  }
}

const typeButtonTitle: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--ink-primary)',
}

const typeButtonSubtitle: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  lineHeight: 1.4,
}
