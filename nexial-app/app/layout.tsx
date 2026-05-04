import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import AppNav from '@/components/layout/AppNav'
import OnboardingGate from '@/components/OnboardingGate'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nexial',
    template: '%s · Nexial',
  },
  description: 'Investment decision and execution engine',
  applicationName: 'Nexial',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07111f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#07111f_45%,#020617_100%)] text-white selection:bg-cyan-300/30 selection:text-white">
        <OnboardingGate>
          <AppNav>{children}</AppNav>
        </OnboardingGate>
      </body>
    </html>
  )
}