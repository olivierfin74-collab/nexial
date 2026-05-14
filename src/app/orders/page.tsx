import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'

// Placeholder while the execution surface (orders in flight, suggested,
// manual, history) is wired in a follow-up commit. Lives inside the
// unified v3 AppShell so the new bottom-nav tab cannot 404.
export default function OrdersPage() {
  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Exécution"
        title="Orders"
        subtitle="Ordres en cours, proposés, manuels et historique."
        compact
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
          La surface d’exécution sera raccordée aux RPC backend dans un
          prochain commit. Cette page sera remplacée sans changer la
          navigation ni le shell.
        </p>
      </div>
    </AppShell>
  )
}
