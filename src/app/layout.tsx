import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Nexial',
  description: 'Copilote investissement',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Nexial
            </Link>

            <nav className="flex gap-6 text-sm font-semibold flex-wrap">
              <Link href="/">Dashboard</Link>
              <Link href="/portfolio">Portefeuille</Link>
              <Link href="/allocation">Allocation</Link>
              <Link href="/opportunities">Opportunités</Link>
              <Link href="/signals">Signals</Link>
              <Link href="/invest">Investir</Link>
              <Link href="/watchlist">Watchlist</Link>
              <Link href="/preferences">Préférences</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}