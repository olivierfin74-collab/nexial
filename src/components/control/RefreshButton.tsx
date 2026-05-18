'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'

const COOLDOWN_MS = 5_000

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // Tick toutes les secondes uniquement pendant un cooldown actif,
  // pour ne pas re-render inutilement le reste du temps.
  useEffect(() => {
    if (cooldownUntil <= now) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [cooldownUntil, now])

  const remainingMs = Math.max(0, cooldownUntil - now)
  const disabled = isPending || remainingMs > 0
  const remainingSec = Math.ceil(remainingMs / 1000)

  const onClick = useCallback(() => {
    setCooldownUntil(Date.now() + COOLDOWN_MS)
    setNow(Date.now())
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={disabled ? `Rechargement disponible dans ${remainingSec || 1}s` : 'Recharger les données'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        padding: '0 12px',
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        background: disabled ? 'rgba(0,0,0,0.03)' : 'var(--surface)',
        color: disabled ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
        fontFamily: 'var(--font-editorial-mono)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity 120ms ease-out',
      }}
    >
      <RotateCw size={14} aria-hidden style={{ animation: isPending ? 'nx-spin 800ms linear infinite' : undefined }} />
      <span>{disabled && remainingSec > 0 ? `MAJ · ${remainingSec}s` : 'MAJ'}</span>
      <style>{`@keyframes nx-spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
