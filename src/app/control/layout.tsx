import type { Metadata, Viewport } from 'next'

// Per-route metadata override. Next.js 16 documente explicitement que les
// objets metadata exportés depuis des segments imbriqués sont mergés
// shallowly et remplacent les champs de même clé du parent
// (next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md
//  §"Merging" — "Duplicate keys are replaced based on their ordering").
// Donc `manifest` ici remplace `/manifest.json` du root layout uniquement
// pour les routes sous /control. La PWA principale reste intacte.
export const metadata: Metadata = {
  title: 'Nexial Control',
  description: 'Tour de contrôle CIO — supervision Nexial',
  manifest: '/control-manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#A0843D',
}

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
