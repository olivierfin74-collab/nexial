'use client'

import { useEffect, useState } from 'react'
import NexialApp from '../../../nexial-app-complete'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'
import MorningBriefCard from '@/components/MorningBriefCard'
import { DecisionalInbox } from '@/components/ui/decisional'
import type { InboxPayload } from '@/types/decision'

interface FetchState {
  inbox: InboxPayload | null
  loading: boolean
  error: string | null
}

export default function AujourdhuiPage() {
  const [state, setState] = useState<FetchState>({
    inbox: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/today/decisional-alerts', { cache: 'no-store' })
        const json = await res.json()
        if (cancelled) return
        setState({
          inbox: (json?.inbox as InboxPayload | null) ?? null,
          loading: false,
          error: json?.error || null,
        })
      } catch (err) {
        if (cancelled) return
        setState({
          inbox: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Erreur réseau',
        })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBF9F4' }}>
      <MorningBriefCard />
      <FlashDropEventsStrip />

      <DecisionalInbox
        summary={state.inbox?.summary ?? null}
        thesisGap={state.inbox?.thesis_gap ?? null}
        sections={state.inbox?.sections ?? null}
        loading={state.loading}
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
