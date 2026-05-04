'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InvestmentMode = 'dca' | 'opportuniste'
type AccountScope = 'pea' | 'cto' | 'both'

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<InvestmentMode | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [account, setAccount] = useState<AccountScope | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish() {
    setLoading(true)
    setError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setError('Utilisateur non connecté. Reconnecte-toi puis relance l’onboarding.')
      return
    }

    if (!mode || !amount || !account) {
      setLoading(false)
      setError('Onboarding incomplet. Reviens aux étapes précédentes.')
      return
    }

    const { error: upsertError } = await supabase.from('user_onboarding_state_v1').upsert(
      {
        user_id: user.id,
        onboarding_status: 'completed',
        investment_mode: mode,
        monthly_amount: amount,
        account_scope: account,
        current_step: 4,
        completed_at: new Date().toISOString(),
        context: {
          source: 'beta_onboarding',
          version: 'v1',
        },
      },
      {
        onConflict: 'user_id',
      }
    )

    if (upsertError) {
      setLoading(false)
      setError(upsertError.message)
      return
    }

    router.push('/actions')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08111f] p-6 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#101827] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Nexial beta
          </span>
          <span className="text-sm text-slate-500">Étape {step}/4</span>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="text-3xl font-semibold">Que veux-tu faire ?</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Choisis ton objectif principal. Nexial adaptera ensuite les actions proposées.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setMode('dca')
                  setStep(2)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="font-semibold">Investir chaque mois</div>
                <div className="mt-1 text-sm text-slate-400">Approche simple, régulière et pilotée.</div>
              </button>

              <button
                onClick={() => {
                  setMode('opportuniste')
                  setStep(2)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="font-semibold">Chercher des opportunités</div>
                <div className="mt-1 text-sm text-slate-400">Attendre les meilleurs points d’entrée.</div>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-3xl font-semibold">Montant mensuel</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Choisis une enveloppe de départ pour calibrer les recommandations.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[200, 500, 1000, 2000].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setAmount(value)
                    setStep(3)
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 font-semibold hover:bg-white/10"
                >
                  {value}€
                </button>
              ))}
            </div>

            <button onClick={() => setStep(1)} className="mt-5 text-sm text-slate-400 hover:text-white">
              Retour
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-3xl font-semibold">Enveloppe</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sélectionne le cadre d’investissement à utiliser pour la beta.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setAccount('pea')
                  setStep(4)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                PEA
              </button>

              <button
                onClick={() => {
                  setAccount('cto')
                  setStep(4)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                CTO
              </button>

              <button
                onClick={() => {
                  setAccount('both')
                  setStep(4)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                Les deux
              </button>
            </div>

            <button onClick={() => setStep(2)} className="mt-5 text-sm text-slate-400 hover:text-white">
              Retour
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-3xl font-semibold">Setup terminé</h1>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              <p>
                Mode : <span className="font-semibold text-white">{mode}</span>
              </p>
              <p>
                Montant : <span className="font-semibold text-white">{amount}€</span>
              </p>
              <p>
                Enveloppe : <span className="font-semibold text-white">{account}</span>
              </p>
            </div>

            <p className="mt-4 text-slate-400">
              Nexial est prêt. Tu vas maintenant voir les meilleures actions à exécuter.
            </p>

            <button
              onClick={finish}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 p-4 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Enregistrement...' : 'Voir mes actions'}
            </button>

            <button onClick={() => setStep(3)} className="mt-5 text-sm text-slate-400 hover:text-white">
              Retour
            </button>
          </>
        )}
      </div>
    </main>
  )
}