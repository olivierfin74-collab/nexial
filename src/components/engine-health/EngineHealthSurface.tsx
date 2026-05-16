'use client'

import type { CSSProperties } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'

const proofRows = [
  ['Alpha vs baseline', 'leger avantage observe'],
  ['Drawdown evite', 'signal de protection a confirmer'],
  ['Qualite moyenne signaux', 'correcte, branchement en attente'],
  ['Faux positifs', 'a mesurer'],
  ['Opportunites detectees', 'couverture en validation'],
]

const anomalies = [
  'Aucune anomalie critique',
  'Verification de rythme a prevoir',
  'Donnees encore insuffisantes',
]

export function EngineHealthSurface() {
  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Sante moteur"
        title="Sante moteur"
        subtitle="Lecture provisoire, sans branchement moteur."
        compact
      />

      <main style={surface}>
        <section style={verdictBlock} aria-labelledby="engine-health-verdict">
          <span style={eyebrow}>Verdict</span>
          <h1 id="engine-health-verdict" style={verdictTitle}>
            Le moteur progresse
          </h1>
          <p style={verdictNote}>Score indicatif en attente de branchement moteur.</p>
        </section>

        <section style={section}>
          <span style={eyebrow}>Explication courte</span>
          <p style={explanation}>
            Les signaux recents semblent legerement meilleurs qu&apos;un scenario simple de
            reference.
          </p>
        </section>

        <section style={section}>
          <span style={eyebrow}>Preuves minimales</span>
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
          <span style={eyebrow}>Anomalies</span>
          <ul style={listReset}>
            {anomalies.map((item, index) => (
              <li
                key={item}
                style={{
                  ...anomalyRow,
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    ...dot,
                    background: index === 0 ? 'var(--forest-green)' : '#B8924A',
                  }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section style={section}>
          <span style={eyebrow}>Graphique unique</span>
          <div aria-label="Nexial vs baseline" style={chartBox}>
            <div style={chartHeader}>
              <span style={chartTitle}>Nexial vs baseline</span>
              <span style={chartStatus}>Placeholder</span>
            </div>
            <div aria-hidden style={chartPlot}>
              <span style={baselineLine} />
              <span style={nexialLine} />
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  )
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
  minHeight: 34,
  display: 'grid',
  gridTemplateColumns: 'minmax(132px, 0.8fr) minmax(0, 1.2fr)',
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
  fontSize: 12,
  lineHeight: 1.35,
  color: 'var(--ink-secondary)',
  textAlign: 'right',
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
  height: 118,
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

const chartPlot: CSSProperties = {
  position: 'relative',
  height: 58,
  borderBottom: '1px solid rgba(31,49,37,0.14)',
}

const baselineLine: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 17,
  height: 2,
  borderRadius: 999,
  background: 'rgba(31,49,37,0.24)',
}

const nexialLine: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 24,
  height: 2,
  borderRadius: 999,
  background: 'var(--forest-green)',
  transform: 'rotate(-1.5deg)',
  transformOrigin: 'left center',
}
