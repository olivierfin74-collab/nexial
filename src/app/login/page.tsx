'use client'

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'sent' | 'error'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const emailInputId = useId()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loading = status === 'loading'
  const trimmedEmail = email.trim()
  const canSubmit = trimmedEmail.length > 0 && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    setErrorMessage(null)

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '')

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/aujourdhui`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }
    setStatus('sent')
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
          Entrez votre email, recevez un lien magique.
        </p>

        {status === 'sent' ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: 'var(--pour-bg)',
              border: '1px solid var(--forest-green-light)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'var(--font-editorial-sans)',
              color: 'var(--forest-green)',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
              ✓ Lien envoyé
            </strong>
            Vérifiez votre boîte mail. Le lien expire dans 1h.
          </div>
        ) : (
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
                style={{
                  background: 'var(--canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 15,
                  color: 'var(--ink-primary)',
                  outline: 'none',
                  width: '100%',
                }}
              />
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
              {loading ? 'Envoi en cours…' : 'Recevoir le lien'}
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
                {errorMessage ?? "Erreur lors de l'envoi du lien."}
              </div>
            )}
          </form>
        )}

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
      </div>
    </div>
  )
}
