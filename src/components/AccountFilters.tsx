'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

type Props = {
  accountTypes: string[]
  brokers: string[]
  accounts: string[]
}

export default function AccountFilters({
  accountTypes,
  brokers,
  accounts,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') ?? 'ALL'
  const currentBroker = searchParams.get('broker') ?? 'ALL'
  const currentAccount = searchParams.get('account') ?? 'ALL'

  const filteredAccounts = useMemo(() => {
    return accounts
  }, [accounts])

  function updateFilters(next: {
    type?: string
    broker?: string
    account?: string
  }) {
    const params = new URLSearchParams(searchParams.toString())

    const type = next.type ?? currentType
    const broker = next.broker ?? currentBroker
    const account = next.account ?? currentAccount

    if (type === 'ALL') params.delete('type')
    else params.set('type', type)

    if (broker === 'ALL') params.delete('broker')
    else params.set('broker', broker)

    if (account === 'ALL') params.delete('account')
    else params.set('account', account)

    router.push(`${pathname}?${params.toString()}`)
  }

  function resetFilters() {
    router.push(pathname)
  }

  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="font-semibold">Filtres</h2>
          <p className="text-sm text-gray-600">
            Filtrer par type de compte, broker ou compte exact
          </p>
        </div>

        <button
          onClick={resetFilters}
          className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50"
        >
          Réinitialiser
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Type">
          <select
            value={currentType}
            onChange={(e) => updateFilters({ type: e.target.value, account: 'ALL' })}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="ALL">Tous</option>
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Broker">
          <select
            value={currentBroker}
            onChange={(e) => updateFilters({ broker: e.target.value, account: 'ALL' })}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="ALL">Tous</option>
            {brokers.map((broker) => (
              <option key={broker} value={broker}>
                {broker}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Compte">
          <select
            value={currentAccount}
            onChange={(e) => updateFilters({ account: e.target.value })}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="ALL">Tous</option>
            {filteredAccounts.map((account) => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
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