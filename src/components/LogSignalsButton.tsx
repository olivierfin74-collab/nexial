'use client'

import { useState } from 'react'

type Props = {
  triggers: any[]
  portfolio: any[]
}

export default function LogSignalsButton({ triggers, portfolio }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/signals/log', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          triggers,
          portfolio,
        }),
      })

      const json = await res.json()

      if (json.ok) {
        setMessage(`✅ ${json.inserted} signal(s) enregistré(s)`)
      } else {
        setMessage('❌ Erreur enregistrement')
      }
    } catch {
      setMessage('❌ Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading || triggers.length === 0}
        className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer les signaux du jour'}
      </button>

      {message && <div className="text-sm text-gray-700">{message}</div>}
    </div>
  )
}