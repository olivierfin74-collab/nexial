'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FeedbackModalProps = {
  page: string
}

export default function FeedbackModal({ page }: FeedbackModalProps) {
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState('confusion')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(3)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!message.trim()) return

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('user_feedback_v1').insert({
      user_id: user?.id,
      page,
      feedback_type: type,
      message: message.trim(),
      rating,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : null,
      },
    })

    setLoading(false)

    if (!error) {
      setSent(true)
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setSent(false)
      }, 1200)
    } else {
      console.error(error)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur hover:bg-slate-800"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Donner un retour
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Une phrase suffit. L’objectif est d’améliorer Nexial rapidement.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            {sent ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                Merci, retour envoyé.
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white outline-none"
                >
                  <option value="confusion">Je ne comprends pas</option>
                  <option value="bug">Bug</option>
                  <option value="ux">UX / ergonomie</option>
                  <option value="idea">Idée</option>
                </select>

                <textarea
                  placeholder="Exemple : je ne comprends pas pourquoi aucun ordre n’est proposé..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white outline-none placeholder:text-slate-500"
                />

                <div>
                  <div className="mb-2 flex justify-between text-xs text-slate-400">
                    <span>Clarté / satisfaction</span>
                    <span>{rating}/5</span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={loading || !message.trim()}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}