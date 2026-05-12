import './globals.css'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { BrowserNotificationsRuntime } from '@/components/BrowserNotifications'
import GuidedOnboardingTour from '@/components/GuidedOnboardingTour'

export const metadata = {
  title: 'Nexial',
  description: 'Nexial investment cockpit',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#1F4A2E',
}

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
      <body className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#FBF9F4', color: '#1F2937' }}>
        <BrowserNotificationsRuntime />
        {children}
        <GuidedOnboardingTour />
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
