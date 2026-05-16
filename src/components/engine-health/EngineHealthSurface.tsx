'use client'

import type { CSSProperties } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'

const proofRows = [
  ['Alpha vs baseline', 'En attente de mesure'],
  ['Qualité moyenne des signaux', 'Non disponible'],
  ['Faux positifs', 'En attente de mesure'],
  ['Drawdown évité', 'Non disponible'],
  ['Opportunités détectées', 'En attente de mesure'],
]

const anomalies = [
  'Pas d’anomalie critique détectée dans les données disponibles.',
]

export function EngineHealthSurface() {
  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Moteur"
        title="Santé du moteur"
        subtitle="Qualité des décisions et signaux récents"
        extras={<StatusBadge label="En observation" />}
        compact
      />

      <main style={surface}>
        <section style={verdictBlock} aria-labelledby="engine-health-verdict">
          <span style={eyebrowOnDark}>Verdict moteur</span>
          <h1 id="engine-health-verdict" style={verdictTitle}>
            Moteur en observation
          </h1>
          <p style={verdictNote}>
            Les premières mesures sont en place. Le moteur doit maintenant accumuler
            davantage de résultats pour être évalué correctement.
          </p>
        </section>

        <section style={section}>
          <span style={eyebrow}>KPI essentiels</span>
          <ul style={listReset}>
            {proofRows.map(([label, value], index) => (
              <li
                key={label}
                style={{
                  ...compactRow,
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <span style={rowLabel}>{label}</span>
                <span style={rowValue}>{value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section style={section}>
          <span style={eyebrow}>Ce qui dégrade le moteur</span>
          <ul style={listReset}>
            {anomalies.map((item, index) => (
              <li
                key={item}
                style={{
                  ...anomalyRow,
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <span aria-hidden style={{ ...dot, background: 'var(--forest-green)' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section style={section}>
          <span style={eyebrow}>Graphique unique</span>
          <div aria-label="Historique de qualité moteur" style={chartBox}>
            <div style={chartHeader}>
              <span style={chartTitle}>Qualité moteur</span>
              <span style={chartStatus}>Mesure en cours</span>
            </div>
            <div style={chartEmptyState}>
              Historique de qualité moteur en cours de constitution.
            </div>
          </div>
        </section>

        <section style={section}>
          <span style={eyebrow}>Prochaine mesure utile</span>
          <p style={explanation}>
            Accumuler les résultats des signaux à 1j, 5j et 20j pour comparer V3,
            versions expérimentales et baseline ETF.
          </p>
        </section>
      </main>
    </AppShell>
  )
}

function StatusBadge({ label }: { label: string }) {
  return <span style={statusBadge}>{label}</span>
}

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '0 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const verdictBlock: CSSProperties = {
  background: 'var(--forest-deep)',
  border: '1px solid #15321F',
  borderRadius: 10,
  padding: '18px 16px',
  color: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const section: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const eyebrowOnDark: CSSProperties = {
  ...eyebrow,
  color: 'var(--forest-green-pale)',
}

const verdictTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 30,
  fontWeight: 600,
  lineHeight: 1.05,
  color: '#FFFFFF',
}

const verdictNote: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  lineHeight: 1.35,
  color: 'rgba(255,255,255,0.76)',
}

const explanation: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  lineHeight: 1.42,
  color: 'var(--ink-primary)',
}

const listReset: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
}

const compactRow: CSSProperties = {
  minHeight: 36,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'center',
}

const rowLabel: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  fontWeight: 650,
  color: 'var(--ink-primary)',
}

const rowValue: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11.5,
  lineHeight: 1.35,
  color: 'var(--ink-tertiary)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

const anomalyRow: CSSProperties = {
  minHeight: 30,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  color: 'var(--ink-secondary)',
}

const dot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 999,
  flexShrink: 0,
}

const chartBox: CSSProperties = {
  minHeight: 112,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: '#FBF9F4',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  overflow: 'hidden',
}

const chartHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 10,
}

const chartTitle: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 650,
  color: 'var(--ink-primary)',
}

const chartStatus: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const chartEmptyState: CSSProperties = {
  minHeight: 58,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderTop: '1px solid rgba(31,49,37,0.08)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  lineHeight: 1.4,
  color: 'var(--ink-secondary)',
  textAlign: 'center',
}

const statusBadge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  minHeight: 24,
  padding: '0 9px',
  borderRadius: 999,
  border: '1px solid rgba(45,95,63,0.18)',
  background: 'rgba(45,95,63,0.06)',
  color: 'var(--forest-green)',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}
