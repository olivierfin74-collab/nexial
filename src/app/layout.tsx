import './globals.css'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import AppNav from '@/components/layout/AppNav'
import { Toaster } from 'sonner'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#07111f_45%,#020617_100%)] text-white">
        <AppNav>{children}</AppNav>
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          theme="light"
          toastOptions={{
            style: {
              fontFamily: "'Inter', system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  )
}