'use client'

import { Suspense, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'error'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell><div /></LoginShell>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginShell({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/aujourdhui'

  const supabase = useMemo(() => createClient(), [])
  const emailInputId = useId()
  const passwordInputId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loading = status === 'loading'
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <LoginShell>
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
        Connexion
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
        Entrez votre email et votre mot de passe.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={emailInputId}
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            Email
          </label>
          <input
            id={emailInputId}
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={passwordInputId}
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            Mot de passe
          </label>
          <input
            id={passwordInputId}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="transition-colors duration-150"
          style={{
            ...primaryButtonStyle,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.7,
          }}
        >
          {loading ? 'Connexion en cours…' : 'Se connecter'}
        </button>

        {status === 'error' && (
          <div role="alert" style={errorBoxStyle}>
            {errorMessage ?? 'Erreur de connexion.'}
          </div>
        )}
      </form>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link
          href="/reset-password"
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            color: 'var(--ink-secondary)',
            textDecoration: 'none',
          }}
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
        }}
      >
        <Link
          href="/aujourdhui"
          style={{ color: 'var(--ink-secondary)', textDecoration: 'none' }}
        >
          ← Retour à Aujourd&apos;hui
        </Link>
      </div>
    </LoginShell>
  )
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

const primaryButtonStyle: React.CSSProperties = {
  background: 'var(--forest-green)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 16px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 500,
}

const errorBoxStyle: React.CSSProperties = {
  background: 'var(--contre-bg)',
  border: '1px solid var(--burgundy-light)',
  borderRadius: 8,
  padding: 12,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--burgundy)',
  wordBreak: 'break-word',
}
