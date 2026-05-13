'use client'

import { useEffect, useRef } from 'react'
import type {
  AlertDecisionPayload,
  DecisionalSection,
  DecisionalSectionKey,
} from '@/types/decision'
import { DecisionalAlertCard } from './AlertCard'
import { EmptyDecisionState } from './SystemStates'

interface InboxSectionProps {
  sectionKey: DecisionalSectionKey
  section: DecisionalSection
  onAction?: (actionCode: string, decision: AlertDecisionPayload) => void
  /** Called once per mount when the section enters the viewport,
   *  with the alert_ids of items still in status 'NEW'. */
  onMarkSeen?: (alertIds: string[]) => void
  /** Render an empty state when count is 0 (default: hide section). */
  showWhenEmpty?: boolean
}

export function InboxSection({
  sectionKey,
  section,
  onAction,
  onMarkSeen,
  showWhenEmpty = false,
}: InboxSectionProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!onMarkSeen || firedRef.current) return
    const el = rootRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) {
            const newIds = section.items
              .filter((i) => i.status === 'NEW')
              .map((i) => i.alert_id)
            if (newIds.length > 0) onMarkSeen(newIds)
            firedRef.current = true
            obs.disconnect()
          }
        }
      },
      { rootMargin: '0px', threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [onMarkSeen, section])

  const isEmpty = section.count === 0 || section.items.length === 0
  if (isEmpty && !showWhenEmpty) return null

  return (
    <section
      ref={rootRef}
      data-section-key={sectionKey}
      className="flex flex-col gap-3"
      aria-labelledby={`inbox-section-${sectionKey}`}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id={`inbox-section-${sectionKey}`}
            className="flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {section.emoji ? <span aria-hidden>{section.emoji}</span> : null}
            <span>{section.label_fr}</span>
          </h2>
          <span
            aria-hidden
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              letterSpacing: '0.05em',
            }}
          >
            {section.count}
          </span>
        </div>
        {section.description_fr ? (
          <p
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              color: 'var(--ink-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {section.description_fr}
          </p>
        ) : null}
      </header>

      {isEmpty ? (
        <EmptyDecisionState
          title="Rien dans cette section"
          message="Aucun élément à afficher pour l’instant."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {section.items.map((item) => (
            <DecisionalAlertCard
              key={item.alert_id}
              decision={item}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </section>
  )
}
