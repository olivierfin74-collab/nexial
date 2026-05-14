import SettingsPageClient from "@/components/SettingsPageClient";
import { AppShell } from "@/components/shell/AppShell";
import { MobileTopHeader } from "@/components/shell/MobileTopHeader";

// /settings now lives inside the unified v3 AppShell so the route
// shares the same React tree, the same bottom nav and the same
// router lifecycle as /aujourdhui, /sniper, /portefeuille and
// /watchlist. The Settings shortcut in MobileTopHeader is hidden here
// (we're already on the page) but the bell is kept.
export default function SettingsPage() {
  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Préférences"
        title="Réglages"
        showSettings={false}
        showVersion
      />
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <SettingsPageClient />
      </div>
    </AppShell>
  );
}
