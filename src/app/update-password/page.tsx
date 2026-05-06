'use client'

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'error'

const MIN_LENGTH = 8

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const passwordInputId = useId()
  const confirmInputId = useId()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loading = status === 'loading'
  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit =
    password.length >= MIN_LENGTH && password === confirm && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    setErrorMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    router.push('/aujourdhui')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        fontFamily: 'var(--font-editorial-sans)',
      }}
    >
      <div
        className="w-full max-w-md"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 36,
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: 'var(--ink-primary)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Nouveau mot de passe
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 14,
            color: 'var(--ink-secondary)',
            margin: 0,
            marginBottom: 24,
          }}
        >
          Choisissez un mot de passe d&apos;au moins {MIN_LENGTH} caractères.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={passwordInputId}
              style={labelStyle}
            >
              Nouveau mot de passe
            </label>
            <input
              id={passwordInputId}
              type="password"
              required
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={inputStyle}
            />
            {tooShort && (
              <span style={hintErrorStyle}>
                Au moins {MIN_LENGTH} caractères requis.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={confirmInputId}
              style={labelStyle}
            >
              Confirmer le mot de passe
            </label>
            <input
              id={confirmInputId}
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              style={inputStyle}
            />
            {mismatch && (
              <span style={hintErrorStyle}>
                Les deux mots de passe ne correspondent pas.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="transition-colors duration-150"
            style={{
              background: 'var(--forest-green)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.7,
            }}
          >
            {loading
              ? 'Mise à jour…'
              : 'Définir le nouveau mot de passe'}
          </button>

          {status === 'error' && (
            <div
              role="alert"
              style={{
                background: 'var(--contre-bg)',
                border: '1px solid var(--burgundy-light)',
                borderRadius: 8,
                padding: 12,
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 12,
                color: 'var(--burgundy)',
                wordBreak: 'break-word',
              }}
            >
              <p style={{ margin: 0, marginBottom: 6 }}>
                {errorMessage ?? 'Erreur lors de la mise à jour.'}
              </p>
              <Link
                href="/reset-password"
                style={{
                  color: 'var(--burgundy)',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 12,
                }}
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--canvas)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '12px 16px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 15,
  color: 'var(--ink-primary)',
  outline: 'none',
  width: '100%',
}

const hintErrorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--burgundy)',
}
