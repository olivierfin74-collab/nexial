import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function HomePage() {
  const h = await headers()
  const ua = h.get('user-agent') || ''
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
  redirect(isMobile ? '/mobile' : '/desktop')
}
