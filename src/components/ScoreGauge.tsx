'use client'

interface ScoreGaugeProps {
  score: number | null
  size?: number
  showLabel?: boolean
  className?: string
}

// Amber saturé pour la stroke (var(--alert-amber) #FDF4E3 est trop clair pour un trait visible).
const SCORE_AMBER = '#C68F1A'

function getScoreColor(score: number): string {
  const rounded = Math.round(score)
  if (rounded >= 75) return 'var(--forest-green)'
  if (rounded >= 50) return SCORE_AMBER
  return 'var(--burgundy)'
}

export function ScoreGauge({
  score,
  size = 64,
  showLabel = false,
  className,
}: ScoreGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = 4
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  const isValid = score != null && Number.isFinite(score)
  const clamped = isValid ? Math.max(0, Math.min(100, score!)) : 0
  const dashOffset = isValid
    ? circumference * (1 - clamped / 100)
    : circumference

  const displayValue = isValid ? Math.round(clamped).toString() : '—'
  const ariaLabel = isValid
    ? `Score ${Math.round(clamped)} sur 100`
    : 'Score non disponible'

  const fontSize = size * 0.35
  const labelOffsetY = size * 0.22

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Background track (full ring) */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke="var(--border-subtle)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Foreground arc — only if valid AND > 0 (avoid invisible 0% rendering) */}
      {isValid && clamped > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={getScoreColor(clamped)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      {/* Center value */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-editorial-serif)"
        fontSize={fontSize}
        fill="var(--ink-primary)"
      >
        {displayValue}
      </text>
      {/* Optional label */}
      {showLabel && size >= 80 && (
        <text
          x={cx}
          y={cy + labelOffsetY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-editorial-mono)"
          fontSize={9}
          fill="var(--ink-muted)"
          letterSpacing="0.05em"
          style={{ textTransform: 'uppercase' }}
        >
          score
        </text>
      )}
    </svg>
  )
}
