import type { CSSProperties } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type { OpportunityRecord } from '@/lib/opportunityOfTheDay'

interface OpportunityOfTheDaySurfaceProps {
  payload: OpportunityRecord | null
  error?: string | null
}

type OpportunityItem = OpportunityRecord

export function OpportunityOfTheDaySurface({
  payload,
  error = null,
}: OpportunityOfTheDaySurfaceProps) {
  const generatedAt = readString(payload, ['generated_at', 'computed_at', 'as_of'])
  const empty = readRecord(payload, ['empty_state'])
  const primary = extractPrimary(payload)
  const secondary = extractSecondary(payload, primary).slice(0, 2)
  const hasOpportunity = Boolean(primary)

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Aujourd'hui"
        title="Opportunite du Jour"
        subtitle="Lecture directe du backend."
        compact
      />

      <main style={surface}>
        <section style={hero}>
          <div style={topLine}>
            <span style={sourceLabel}>fn_opportunity_of_the_day</span>
            <RefreshLink />
          </div>

          {error ? (
            <EmptyState
              title="Lecture indisponible"
              message="La source backend n'a pas pu etre lue."
              detail={error}
            />
          ) : hasOpportunity && primary ? (
            <PrimaryOpportunity item={primary} />
          ) : (
            <EmptyState
              title={
                readString(empty, ['title_fr', 'title']) ??
                readString(payload, ['title_fr', 'title']) ??
                "Aucune opportunite aujourd'hui"
              }
              message={
                readString(empty, ['message_fr', 'subtitle_fr', 'message']) ??
                readString(payload, ['message_fr', 'subtitle_fr', 'reason_fr']) ??
                "Le backend ne signale aucune action prioritaire."
              }
            />
          )}

          {generatedAt ? <p style={timestamp}>Mis a jour: {formatDate(generatedAt)}</p> : null}
        </section>

        {secondary.length > 0 ? (
          <section style={secondarySection}>
            <h2 style={sectionTitle}>Secondaires</h2>
            <div style={secondaryStack}>
              {secondary.map((item, index) => (
                <SecondaryOpportunity
                  key={readString(item, ['id', 'alert_id', 'asset_id', 'ticker']) ?? index}
                  item={item}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  )
}

function PrimaryOpportunity({ item }: { item: OpportunityItem }) {
  const ticker = readString(item, ['ticker', 'symbol'])
  const name = readString(item, ['asset_name_fr', 'asset_name', 'name_fr', 'name'])
  const title =
    readString(item, ['headline_fr', 'title_fr', 'decision_fr', 'label_fr']) ??
    ticker ??
    'Opportunite'
  const reason = readString(item, ['reason_fr', 'thesis_fr', 'message_fr', 'summary_fr', 'subtitle_fr'])
  const verdict = readNestedString(item, ['verdict'], ['label_fr', 'label']) ??
    readString(item, ['verdict_label_fr', 'priority_label_fr', 'status_fr'])
  const context = readRecord(item, ['context_compact'])
  const price = readString(context, ['price_display']) ?? readString(item, ['price_display'])
  const delta = readString(context, ['delta_display']) ?? readString(item, ['delta_display'])
  const cta = readRecord(item, ['cta'])
  const ctaLabel = readString(cta, ['label_fr', 'label'])
  const href = readString(cta, ['redirect_to', 'href', 'url']) ?? readString(item, ['href', 'url'])

  return (
    <article style={primaryCard}>
      <div style={assetLine}>
        {ticker ? <span style={tickerStyle}>{ticker}</span> : null}
        {name ? <span style={assetName}>{name}</span> : null}
      </div>
      {verdict ? <span style={verdictStyle}>{verdict}</span> : null}
      <h1 style={headline}>{title}</h1>
      {reason ? <p style={reasonStyle}>{reason}</p> : null}
      {(price || delta) ? (
        <div style={facts}>
          {price ? <span>{price}</span> : null}
          {delta ? <span>{delta}</span> : null}
        </div>
      ) : null}
      {ctaLabel ? <Cta label={ctaLabel} href={href} /> : null}
    </article>
  )
}

function SecondaryOpportunity({ item }: { item: OpportunityItem }) {
  const ticker = readString(item, ['ticker', 'symbol'])
  const title = readString(item, ['headline_fr', 'title_fr', 'label_fr']) ?? ticker ?? 'Opportunite'
  const verdict = readNestedString(item, ['verdict'], ['label_fr', 'label']) ??
    readString(item, ['verdict_label_fr', 'priority_label_fr', 'status_fr'])

  return (
    <article style={secondaryCard}>
      <div style={{ minWidth: 0 }}>
        <div style={secondaryTicker}>{ticker}</div>
        <p style={secondaryTitle}>{title}</p>
      </div>
      {verdict ? <span style={secondaryVerdict}>{verdict}</span> : null}
    </article>
  )
}

function EmptyState({
  title,
  message,
  detail,
}: {
  title: string
  message: string
  detail?: string
}) {
  return (
    <article style={emptyCard}>
      <span style={emptyEyebrow}>Cas 2</span>
      <h1 style={emptyTitle}>{title}</h1>
      <p style={emptyMessage}>{message}</p>
      {detail ? <p style={emptyDetail}>{detail}</p> : null}
    </article>
  )
}

function Cta({ label, href }: { label: string; href: string | null }) {
  if (!href) {
    return <span style={passiveCta}>{label}</span>
  }

  return (
    <Link href={href} style={linkCta}>
      {label}
    </Link>
  )
}

function RefreshLink() {
  return (
    <Link href="/aujourdhui" style={refreshLink} aria-label="Rafraichir">
      <RefreshCw size={14} aria-hidden />
    </Link>
  )
}

function extractPrimary(payload: OpportunityRecord | null): OpportunityItem | null {
  if (!payload) return null

  const direct = readRecord(payload, [
    'primary',
    'main',
    'opportunity',
    'opportunity_of_the_day',
    'item',
  ])
  if (direct) return direct

  const items = readArray(payload, [
    'items',
    'opportunities',
    'candidates',
    'secondary',
    'secondary_opportunities',
  ])

  return items[0] ?? null
}

function extractSecondary(
  payload: OpportunityRecord | null,
  primary: OpportunityItem | null,
): OpportunityItem[] {
  if (!payload) return []

  const explicit = readArray(payload, ['secondary', 'secondary_opportunities', 'alternatives'])
  if (explicit.length > 0) return explicit

  const items = readArray(payload, ['items', 'opportunities', 'candidates'])
  if (!primary) return items

  return items.filter((item) => item !== primary)
}

function readString(
  record: OpportunityRecord | null | undefined,
  keys: string[],
): string | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function readRecord(
  record: OpportunityRecord | null | undefined,
  keys: string[],
): OpportunityRecord | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (isRecord(value)) return value
  }
  return null
}

function readArray(
  record: OpportunityRecord | null | undefined,
  keys: string[],
): OpportunityItem[] {
  if (!record) return []
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  return []
}

function readNestedString(
  record: OpportunityRecord,
  objectKeys: string[],
  stringKeys: string[],
): string | null {
  return readString(readRecord(record, objectKeys), stringKeys)
}

function isRecord(value: unknown): value is OpportunityRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '0 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const hero: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const topLine: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
}

const sourceLabel: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.05em',
}

const primaryCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const assetLine: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  minWidth: 0,
}

const tickerStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 15,
  fontWeight: 800,
  color: 'var(--ink-primary)',
}

const assetName: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-secondary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const verdictStyle: CSSProperties = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--forest-deep)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
}

const headline: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 24,
  lineHeight: 1.12,
  fontWeight: 500,
  color: 'var(--ink-primary)',
}

const reasonStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  lineHeight: 1.45,
  color: 'var(--ink-secondary)',
}

const facts: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--ink-primary)',
}

const linkCta: CSSProperties = {
  minHeight: 44,
  borderRadius: 8,
  background: 'var(--forest-deep)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 14px',
  textDecoration: 'none',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
  alignSelf: 'flex-start',
}

const passiveCta: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--forest-deep)',
}

const refreshLink: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--ink-secondary)',
  textDecoration: 'none',
}

const timestamp: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
}

const emptyCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '6px 0 2px',
}

const emptyEyebrow: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--forest-deep)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const emptyTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 25,
  lineHeight: 1.12,
  fontWeight: 500,
  color: 'var(--ink-primary)',
}

const emptyMessage: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  lineHeight: 1.45,
  color: 'var(--ink-secondary)',
}

const emptyDetail: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  lineHeight: 1.4,
  color: 'var(--burgundy)',
  wordBreak: 'break-word',
}

const secondarySection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const sectionTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const secondaryStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const secondaryCard: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 10,
  alignItems: 'center',
}

const secondaryTicker: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--ink-primary)',
}

const secondaryTitle: CSSProperties = {
  margin: '2px 0 0',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  lineHeight: 1.35,
  color: 'var(--ink-secondary)',
}

const secondaryVerdict: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}
