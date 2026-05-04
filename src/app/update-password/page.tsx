// src/app/update-password/page.tsx

'use client'

import { useState } from 'react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // simulation update (remplace par Supabase)
      await new Promise((r) => setTimeout(r, 1000))

      setMessage('Mot de passe mis à jour avec succès')
    } catch (err) {
      setMessage('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Mettre à jour le mot de passe
        </h1>

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[#020617] border border-white/10 focus:outline-none focus:border-white/30"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}