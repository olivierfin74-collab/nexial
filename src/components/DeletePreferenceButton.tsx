'use client'

import { useState } from 'react'

export default function DeletePreferenceButton({
  id,
}: {
  id: string
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/preferences/delete', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      const json = await res.json()

      if (json.ok) {
        setMessage('✅ Supprimée')
      } else {
        setMessage('❌ Erreur')
      }
    } catch {
      setMessage('❌ Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg border px-3 py-1 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? '...' : 'Supprimer'}
      </button>
      {message && <span className="text-xs text-gray-600">{message}</span>}
    </div>
  )
}