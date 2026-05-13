import type { Position } from '@/types/decision'

interface PositionContextLineProps {
  position: Position
}

export function PositionContextLine({ position }: PositionContextLineProps) {
  if (!position?.context_fr) return null

  const dotColor = position.is_held ? 'var(--forest-green)' : 'var(--ink-muted)'

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
      <span>{position.context_fr}</span>
    </div>
  )
}
