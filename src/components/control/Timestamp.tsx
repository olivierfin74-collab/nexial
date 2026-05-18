import { relativeTime } from '@/lib/control/relativeTime'

interface TimestampProps {
  iso: string | null | undefined
  /** Now au moment du render (passé par le parent pour stabilité SSR). */
  now: Date
  prefix?: string
}

export function Timestamp({ iso, now, prefix = 'Dernière MAJ' }: TimestampProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-editorial-mono)',
        fontSize: 11,
        color: 'var(--ink-tertiary)',
        letterSpacing: '0.04em',
      }}
    >
      {prefix} {relativeTime(iso, now)}
    </span>
  )
}
