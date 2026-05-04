import './globals.css'
import AppNav from '@/components/layout/AppNav'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#07111f_45%,#020617_100%)] text-white">
        <AppNav>{children}</AppNav>
      </body>
    </html>
  )
}