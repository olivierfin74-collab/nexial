export type FilterParams = {
  type?: string
  broker?: string
  account?: string
}

export function applyAccountFilters<T extends Record<string, any>>(
  rows: T[],
  filters: FilterParams
) {
  const type = filters.type ?? 'ALL'
  const broker = filters.broker ?? 'ALL'
  const account = filters.account ?? 'ALL'

  return rows.filter((row) => {
    if (type !== 'ALL' && row.account_type !== type) return false

    const rowBroker = row.broker_code ?? row.broker_name ?? null
    if (broker !== 'ALL' && rowBroker !== broker) return false

    if (account !== 'ALL' && row.account_name !== account) return false

    return true
  })
}

export function buildFilterQuery(filters: FilterParams) {
  const params = new URLSearchParams()

  if (filters.type && filters.type !== 'ALL') {
    params.set('type', filters.type)
  }

  if (filters.broker && filters.broker !== 'ALL') {
    params.set('broker', filters.broker)
  }

  if (filters.account && filters.account !== 'ALL') {
    params.set('account', filters.account)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function uniqueValues(rows: Record<string, any>[], field: string) {
  return Array.from(
    new Set(
      rows
        .map((row) => row[field])
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b)))
}