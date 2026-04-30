import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-[#111a33] text-white">
        <div className="flex h-screen overflow-hidden">

          <Sidebar />

          <div className="flex flex-1 flex-col">
            <Header />

            <main className="flex-1 overflow-y-auto px-5 py-5">
              {children}
            </main>
          </div>

        </div>
      </body>
    </html>
  )
}