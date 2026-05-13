'use client'

import { useEffect, useState } from 'react'
import NexialApp from '../../../nexial-app-complete'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'
import MorningBriefCard from '@/components/MorningBriefCard'
import { DecisionalInbox } from '@/components/ui/decisional'
import type {
  DecisionalFeedPayload,
  InboxPayload,
} from '@/types/decision'

interface FetchState {
  inbox: InboxPayload | null
  feed: DecisionalFeedPayload | null
  loading: boolean
  error: string | null
}

export default function AujourdhuiPage() {
  const [state, setState] = useState<FetchState>({
    inbox: null,
    feed: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [inboxRes, feedRes] = await Promise.all([
          fetch('/api/today/decisional-alerts', { cache: 'no-store' }),
          fetch('/api/alerts/feed', { cache: 'no-store' }),
        ])
        const inboxJson = await inboxRes.json()
        const feedJson = await feedRes.json()
        if (cancelled) return
        setState({
          inbox: (inboxJson?.inbox as InboxPayload | null) ?? null,
          feed: (feedJson?.feed as DecisionalFeedPayload | null) ?? null,
          loading: false,
          error: inboxJson?.error || feedJson?.error || null,
        })
      } catch (err) {
        if (cancelled) return
        setState({
          inbox: null,
          feed: null,
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
        sections={state.feed?.sections ?? null}
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
