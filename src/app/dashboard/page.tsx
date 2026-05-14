import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'

// Placeholder while the real Dashboard surface (fn_dashboard_header
// + fn_portfolio_cash_breakdown) is wired in the next commit. Stays
// inside the unified v3 AppShell so the bottom-nav tab cannot 404.
export default function DashboardPage() {
  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Patrimoine"
        title="Dashboard"
        subtitle="Vue patrimoine en cours de raccordement."
      />
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            color: 'var(--ink-secondary)',
            lineHeight: 1.4,
          }}
        >
          La vue patrimoine (cash, allocation, comptes) est en cours de
          raccordement aux RPC backend v3. Cette page sera remplacée
          dans le prochain commit.
        </p>
      </div>
    </AppShell>
  )
}
