export function getLatestDate(rows: Record<string, any>[], field: string): Date | null {
  const timestamps = rows
    .map((row) => row[field])
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))

  if (timestamps.length === 0) return null

  return new Date(Math.max(...timestamps))
}

export function formatFreshness(date: Date | null) {
  if (!date) return '-'
  return date.toLocaleString('fr-FR')
}