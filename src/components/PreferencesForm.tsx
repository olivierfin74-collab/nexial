'use client'

import { useState } from 'react'

type AssetOption = {
  asset_name: string
  ticker: string | null
  account_type?: string | null
  account_name?: string | null
}

export default function PreferencesForm({
  assets,
}: {
  assets: AssetOption[]
}) {
  const [selected, setSelected] = useState<string>('')
  const [accountScope, setAccountScope] = useState('AUTO')
  const [preferenceType, setPreferenceType] = useState('OVERWEIGHT')
  const [targetWeight, setTargetWeight] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedAsset = assets.find(
    (a) => `${a.asset_name}|||${a.ticker ?? '-'}` === selected
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!selectedAsset) {
      setMessage('❌ Sélectionne un actif')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/preferences/save', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          account_scope: accountScope,
          asset_name: selectedAsset.asset_name,
          ticker: selectedAsset.ticker,
          preference_type: preferenceType,
          target_weight: targetWeight,
          max_weight: maxWeight,
          note,
        }),
      })

      const json = await res.json()

      if (json.ok) {
        setMessage('✅ Préférence enregistrée')
        setSelected('')
        setTargetWeight('')
        setMaxWeight('')
        setNote('')
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
    <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
      <Field label="Actif">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Sélectionner</option>
          {assets.map((a, i) => (
            <option
              key={i}
              value={`${a.asset_name}|||${a.ticker ?? '-'}`}
            >
              {a.asset_name} ({a.ticker ?? '-'})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Scope">
        <select
          value={accountScope}
          onChange={(e) => setAccountScope(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="AUTO">AUTO</option>
          <option value="PEA">PEA</option>
          <option value="CTO">CTO</option>
        </select>
      </Field>

      <Field label="Préférence">
        <select
          value={preferenceType}
          onChange={(e) => setPreferenceType(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="NEUTRAL">NEUTRAL</option>
          <option value="OVERWEIGHT">OVERWEIGHT</option>
          <option value="UNDERWEIGHT">UNDERWEIGHT</option>
          <option value="EXCLUDE">EXCLUDE</option>
        </select>
      </Field>

      <Field label="Cible %">
        <input
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          type="number"
          step="0.1"
          className="w-full rounded-lg border px-3 py-2"
        />
      </Field>

      <Field label="Max %">
        <input
          value={maxWeight}
          onChange={(e) => setMaxWeight(e.target.value)}
          type="number"
          step="0.1"
          className="w-full rounded-lg border px-3 py-2"
        />
      </Field>

      <Field label="Note">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </Field>

      <div className="md:col-span-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border px-4 py-2 bg-black text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la préférence'}
        </button>

        {message && <div className="text-sm text-gray-700">{message}</div>}
      </div>
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  )
}