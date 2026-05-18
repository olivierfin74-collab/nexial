// Rendu "il y a Xmin / il y a Xh / hier" pour le timestamp /control.
// Pure, serializable, sans dépendance externe (G5).

export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return '—'
  const diffMs = now.getTime() - then.getTime()
  if (diffMs < 0) return 'à l’instant'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'à l’instant'
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr} h`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'hier'
  if (day < 7) return `il y a ${day} j`
  return then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Header timestamp : "18 mai · 10:24 UTC"
export function formatHeaderTimestamp(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getUTCDate()
  const month = FR_MONTHS[d.getUTCMonth()]
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} · ${hh}:${mm} UTC`
}
