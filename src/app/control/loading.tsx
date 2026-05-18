import type { CSSProperties } from 'react'

// Skeleton sobre — pas de spinner brut (G8). Reflète la structure réelle :
// header, pavé global, 6 cartes blocs.
export default function ControlLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
      }}
    >
      <header style={headerSkeleton}>
        <div style={{ ...pulse, width: 84, height: 18, borderRadius: 8 }} />
        <div style={{ ...pulse, width: 96, height: 16, borderRadius: 8, margin: '8px auto 0' }} />
      </header>
      <main style={surface}>
        <div style={{ ...pulse, height: 92, borderRadius: 12 }} aria-label="Chargement du statut global" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ...pulse, height: i === 3 || i === 5 ? 140 : 56, borderRadius: 10 }} />
          ))}
        </div>
      </main>
      <style>{`@keyframes nx-control-skeleton { 0%, 100% { opacity: 0.6 } 50% { opacity: 0.9 } }`}</style>
    </div>
  )
}

const headerSkeleton: CSSProperties = {
  borderBottom: '1px solid var(--border-subtle)',
  padding: '12px 14px',
  background: 'rgba(251,249,244,0.94)',
}

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '14px 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const pulse: CSSProperties = {
  background: 'rgba(0,0,0,0.05)',
  animation: 'nx-control-skeleton 1.4s ease-in-out infinite',
}
