// System-state primitives for the decisional UI.
//
// Pure presentational. No fetching, no business logic. Used to render the
// calm states the backend can produce: WAIT, no opportunity, no signal,
// loading.

interface BaseStateProps {
  title: string
  message?: string | null
  /** Optional small caption above the title (e.g. "Aujourd'hui"). */
  eyebrow?: string | null
}

function StateShell({
  title,
  message,
  eyebrow,
  icon,
  background,
  accent,
}: BaseStateProps & { icon: React.ReactNode; background: string; accent: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 text-center"
      style={{
        background,
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '28px 20px',
      }}
    >
      <div
        aria-hidden
        className="flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: 'var(--surface)',
          border: `1px solid ${accent}`,
          color: accent,
        }}
      >
        {icon}
      </div>
      {eyebrow ? (
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {eyebrow}
        </span>
      ) : null}
      <h3
        style={{
          fontFamily: 'var(--font-editorial-serif)',
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--ink-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {message ? (
        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            color: 'var(--ink-secondary)',
            margin: 0,
            maxWidth: 360,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

/** Empty Inbox — nothing to decide right now. Calm, not "broken". */
export function EmptyDecisionState({
  title = 'Rien à décider pour l’instant',
  message = 'Aucune alerte décisionnelle. Nexial reprend dès qu’une opportunité matche votre stratégie.',
  eyebrow,
}: Partial<BaseStateProps> = {}) {
  return (
    <StateShell
      eyebrow={eyebrow ?? null}
      title={title}
      message={message}
      background="var(--pour-bg)"
      accent="var(--forest-green)"
      icon={<span style={{ fontSize: 18 }}>✓</span>}
    />
  )
}

/** Backend has produced a WAIT verdict — explicitly not actionable yet. */
export function WaitState({
  title = 'Patience — Nexial observe',
  message = 'Le contexte de marché ne justifie pas d’action immédiate. Vous serez prévenu dès qu’une décision claire se présente.',
  eyebrow,
}: Partial<BaseStateProps> = {}) {
  return (
    <StateShell
      eyebrow={eyebrow ?? null}
      title={title}
      message={message}
      background="var(--canvas)"
      accent="var(--ink-secondary)"
      icon={<span style={{ fontSize: 18 }}>⏳</span>}
    />
  )
}

/** No opportunity matched filters/thesis right now. */
export function NoActionState({
  title = 'Aucune action à prendre',
  message = 'Votre portefeuille est aligné avec votre thèse. Rien d’urgent côté décision.',
  eyebrow,
}: Partial<BaseStateProps> = {}) {
  return (
    <StateShell
      eyebrow={eyebrow ?? null}
      title={title}
      message={message}
      background="var(--surface)"
      accent="var(--ink-tertiary)"
      icon={<span style={{ fontSize: 18 }}>·</span>}
    />
  )
}

/** Skeleton card while a decision payload is being fetched. */
export function LoadingDecisionCard() {
  const bar = (w: string, h = 12) => (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: w,
        height: h,
        borderRadius: 999,
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.05) 100%)',
        backgroundSize: '200% 100%',
        animation: 'nx-shimmer 1.4s linear infinite',
      }}
    />
  )

  return (
    <article
      aria-busy="true"
      aria-live="polite"
      aria-label="Chargement d’une décision"
      className="flex flex-col gap-3 p-4 sm:p-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          {bar('72px', 16)}
          {bar('110px', 10)}
        </div>
        {bar('96px', 22)}
      </div>
      <div className="flex flex-col gap-2">
        {bar('92%')}
        {bar('70%')}
      </div>
      {bar('40%', 10)}
      <div className="flex gap-2 pt-1">
        {bar('120px', 36)}
        {bar('96px', 36)}
      </div>
      <style>{`
        @keyframes nx-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </article>
  )
}
