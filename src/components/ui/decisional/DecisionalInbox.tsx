'use client'

import type {
  AlertDecisionPayload,
  DecisionalSections,
  InboxSummary,
  ThesisGap,
} from '@/types/decision'
import { DECISIONAL_SECTION_KEYS } from '@/types/decision'
import { InboxSection } from './InboxSection'
import { EmptyDecisionState, LoadingDecisionCard } from './SystemStates'

interface DecisionalInboxProps {
  /** Inbox summary (from fn_inbox_decisional). */
  summary?: InboxSummary | null
  /** Thesis-gap banner (from fn_inbox_decisional.thesis_gap). */
  thesisGap?: ThesisGap | null
  /** Full-shape sections (from fn_alerts_decisional_feed_v2). */
  sections?: DecisionalSections | null
  loading?: boolean
  /** Forwarded to each card. Backend-defined `action_code` dispatch happens upstream. */
  onAction?: (actionCode: string, decision: AlertDecisionPayload) => void
  title?: string
  subtitle?: string | null
}

function ThesisGapBanner({ gap }: { gap: ThesisGap }) {
  if (!gap.count || gap.count < 1) return null
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border p-3"
      style={{
        background: 'var(--alert-amber)',
        borderColor: 'rgba(184, 134, 11, 0.3)',
        color: '#7A5A00',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span aria-hidden style={{ fontSize: 18 }}>
          {gap.emoji || '💡'}
        </span>
        <div className="flex flex-col min-w-0">
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            {gap.label_fr} · {gap.count} position{gap.count > 1 ? 's' : ''}
          </p>
          {gap.description_fr ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                lineHeight: 1.4,
                opacity: 0.85,
              }}
            >
              {gap.description_fr}
            </p>
          ) : null}
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        Couverture {Number(gap.coverage_pct).toFixed(0)} %
      </span>
    </div>
  )
}

export function DecisionalInbox({
  summary,
  thesisGap,
  sections,
  loading = false,
  onAction,
  title = 'Aujourd’hui',
  subtitle = 'Votre boîte de décisions du jour.',
}: DecisionalInboxProps) {
  const isLoading = loading || !sections
  const totalItems = sections
    ? DECISIONAL_SECTION_KEYS.reduce(
        (acc, key) => acc + (sections[key]?.items?.length ?? 0),
        0,
      )
    : 0
  const isEmpty = !isLoading && totalItems === 0
  const actionsExpected = summary?.total_actions_attendues ?? 0

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 md:px-6 md:py-8">
      <header className="flex flex-col gap-1">
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-eyebrow)',
          }}
        >
          Tableau de bord
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--forest-deep)',
            margin: 0,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              color: 'var(--ink-secondary)',
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {summary ? (
          <p
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              margin: '4px 0 0',
            }}
          >
            {actionsExpected} action
            {actionsExpected > 1 ? 's' : ''} attendue
            {actionsExpected > 1 ? 's' : ''}
          </p>
        ) : null}
      </header>

      {thesisGap ? <ThesisGapBanner gap={thesisGap} /> : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <LoadingDecisionCard />
          <LoadingDecisionCard />
        </div>
      ) : isEmpty ? (
        <EmptyDecisionState
          eyebrow="Aujourd’hui"
          title="Rien à décider"
          message="Aucune alerte décisionnelle pour le moment. Nexial vous prévient dès qu’une opportunité matche votre stratégie."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {DECISIONAL_SECTION_KEYS.map((key) => {
            const section = sections![key]
            if (!section) return null
            return (
              <InboxSection
                key={key}
                sectionKey={key}
                section={section}
                onAction={onAction}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
