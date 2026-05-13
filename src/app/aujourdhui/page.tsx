'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'
import MorningBriefCard from '@/components/MorningBriefCard'
import { AppShell } from '@/components/shell/AppShell'
import {
  DecisionalInbox,
  LadderBuilderModal,
  ExitPlanModal,
  ThesisEditorModal,
} from '@/components/ui/decisional'
import type {
  AlertDecisionPayload,
  DispatchAlertActionResult,
  DispatchModalContext,
  DispatchRedirectKind,
  InboxPayload,
} from '@/types/decision'

interface FetchState {
  inbox: InboxPayload | null
  loading: boolean
  error: string | null
}

type ModalKind = Extract<
  DispatchRedirectKind,
  'open_ladder_modal' | 'open_exit_modal' | 'open_thesis_modal' | 'open_thesis_modal_urgent'
>

interface ModalState {
  kind: ModalKind | null
  context: DispatchModalContext | null
}

export default function AujourdhuiPage() {
  const router = useRouter()
  const [state, setState] = useState<FetchState>({
    inbox: null,
    loading: true,
    error: null,
  })
  const [modal, setModal] = useState<ModalState>({ kind: null, context: null })
  const seenSetRef = useRef<Set<string>>(new Set())

  const fetchInbox = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/today/decisional-alerts', {
      cache: 'no-store',
      signal,
    })
    const json = await res.json()
    return {
      inbox: (json?.inbox as InboxPayload | null) ?? null,
      error: (json?.error as string | null) ?? null,
    }
  }, [])

  const reloadInbox = useCallback(async () => {
    try {
      const { inbox, error } = await fetchInbox()
      setState({ inbox, loading: false, error })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Connexion temporairement indisponible',
      }))
    }
  }, [fetchInbox])

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false
    fetchInbox(ctrl.signal)
      .then(({ inbox, error }) => {
        if (cancelled) return
        setState({ inbox, loading: false, error })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          inbox: null,
          loading: false,
          error:
            err instanceof Error ? err.message : 'Connexion temporairement indisponible',
        })
      })
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [fetchInbox])

  const handleMarkSeen = useCallback((alertIds: string[]) => {
    const fresh = alertIds.filter((id) => !seenSetRef.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach((id) => seenSetRef.current.add(id))
    fetch('/api/alerts/seen-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_ids: fresh }),
    }).catch(() => {
      // Silent — SEEN is a best-effort UI hint, not blocking.
    })
  }, [])

  const handleAction = useCallback(
    async (actionCode: string, decision: AlertDecisionPayload) => {
      try {
        const res = await fetch(`/api/alerts/${decision.alert_id}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action_code: actionCode }),
        })
        const json = (await res.json()) as {
          dispatch: DispatchAlertActionResult | null
          error?: string
        }

        if (!res.ok || !json.dispatch?.ok) {
          toast.error(json.error || 'Action non disponible')
          return
        }

        const dispatch = json.dispatch
        toast.success(dispatch.message_fr)

        switch (dispatch.redirect_kind) {
          case 'open_ladder_modal':
            setModal({ kind: 'open_ladder_modal', context: dispatch.modal_context })
            break
          case 'open_exit_modal':
            setModal({ kind: 'open_exit_modal', context: dispatch.modal_context })
            break
          case 'open_thesis_modal':
          case 'open_thesis_modal_urgent': {
            const assetId = dispatch.modal_context?.asset_id ?? null
            if (assetId) {
              setModal({ kind: dispatch.redirect_kind, context: dispatch.modal_context })
            } else if (dispatch.redirect_to) {
              // Backend modal context lacked asset_id but provided a path.
              router.push(dispatch.redirect_to)
            } else {
              toast.error('Action temporairement indisponible')
            }
            break
          }
          case 'refresh_inbox':
          case 'dismiss_confirmed':
            await reloadInbox()
            break
          default:
            // Unknown redirect_kind — fall back to redirect_to or refresh.
            if (dispatch.redirect_to) {
              router.push(dispatch.redirect_to)
            } else {
              await reloadInbox()
            }
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Connexion temporairement indisponible',
        )
      }
    },
    [reloadInbox, router],
  )

  const closeModal = useCallback(async () => {
    setModal({ kind: null, context: null })
    await reloadInbox()
  }, [reloadInbox])

  return (
    <AppShell>
      <MorningBriefCard />
      <FlashDropEventsStrip />

      <DecisionalInbox
        summary={state.inbox?.summary ?? null}
        thesisGap={state.inbox?.thesis_gap ?? null}
        sections={state.inbox?.sections ?? null}
        loading={state.loading}
        onAction={handleAction}
        onMarkSeen={handleMarkSeen}
      />

      {state.error ? (
        <div
          role="status"
          className="mx-auto w-full max-w-5xl px-4 md:px-6"
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
            padding: '8px 0',
          }}
        >
          Certaines données n’ont pas pu être mises à jour.
        </div>
      ) : null}

      <LadderBuilderModal
        open={modal.kind === 'open_ladder_modal'}
        context={modal.context}
        onClose={closeModal}
      />
      <ExitPlanModal
        open={modal.kind === 'open_exit_modal'}
        context={modal.context}
        onClose={closeModal}
      />
      <ThesisEditorModal
        open={
          modal.kind === 'open_thesis_modal' ||
          modal.kind === 'open_thesis_modal_urgent'
        }
        urgent={modal.kind === 'open_thesis_modal_urgent'}
        assetId={modal.context?.asset_id ?? null}
        ticker={modal.context?.ticker}
        onClose={closeModal}
        onSaved={() => {
          void reloadInbox()
        }}
      />
    </AppShell>
  )
}
