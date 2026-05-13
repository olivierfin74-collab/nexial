'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import NexialApp from '../../../nexial-app-complete'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'
import MorningBriefCard from '@/components/MorningBriefCard'
import { DecisionalInbox } from '@/components/ui/decisional'
import type {
  AlertDecisionPayload,
  DispatchAlertActionResult,
  InboxPayload,
} from '@/types/decision'

interface FetchState {
  inbox: InboxPayload | null
  loading: boolean
  error: string | null
}

export default function AujourdhuiPage() {
  const router = useRouter()
  const [state, setState] = useState<FetchState>({
    inbox: null,
    loading: true,
    error: null,
  })
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
        error: err instanceof Error ? err.message : 'Erreur réseau',
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
          error: err instanceof Error ? err.message : 'Erreur réseau',
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

        toast.success(json.dispatch.message_fr)

        if (json.dispatch.redirect_to) {
          router.push(json.dispatch.redirect_to)
        } else {
          await reloadInbox()
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Connexion temporairement indisponible',
        )
      }
    },
    [reloadInbox, router],
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBF9F4' }}>
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
          Certaines données n’ont pas pu être mises à jour ({state.error}).
        </div>
      ) : null}

      <NexialApp initialPage="today" />
    </div>
  )
}
