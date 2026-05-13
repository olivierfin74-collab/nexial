import type { DecisionPositionContext } from '@/types/decision'

interface PositionContextLineProps {
  position: DecisionPositionContext
}

export function PositionContextLine({ position }: PositionContextLineProps) {
  if (!position.in_portfolio && !position.message) return null

  const dotColor = position.in_portfolio ? 'var(--forest-green)' : 'var(--ink-muted)'
  const text =
    position.message ??
    (position.in_portfolio ? 'En portefeuille' : 'Pas encore en portefeuille')

  return (
    <div
      className="flex items-center gap-2"
      style={{
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: 12,
        color: 'var(--ink-secondary)',
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }} />
      <span>{text}</span>
    </div>
  )
}
