import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const quickLinks = [
    {
      href: "/",
      title: "Dashboard",
      text: "Décision centrale, cash disponible et top idées.",
    },
    {
      href: "/portfolio",
      title: "Portefeuille",
      text: "Positions, P&L, poids, filtres et qualité data.",
    },
    {
      href: "/patrimoine",
      title: "Patrimoine",
      text: "Vue consolidée, cash, crypto et répartition globale.",
    },
    {
      href: "/allocation",
      title: "Allocation",
      text: "Répartition ETF, actions, crypto et cash par compte.",
    },
    {
      href: "/invest",
      title: "Investir",
      text: "Top idées, scoring, prix fiable et zones d’achat.",
    },
    {
      href: "/watchlist",
      title: "Watchlist",
      text: "Actifs suivis, prix live et zones de surveillance.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#eef2f7] px-5 py-5 text-slate-900">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#1e3a8a] px-7 py-7 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-200">
                  Wealth Command Center
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                  Espace investisseur
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Accès centralisé aux modules de pilotage : portefeuille,
                  patrimoine, allocation, opportunités et exécution.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-xs text-blue-100">Utilisateur connecté</p>
                <p className="mt-1 text-sm font-medium">{user.email}</p>
                <p className="mt-1 max-w-[260px] truncate text-xs text-slate-300">
                  ID : {user.id}
                </p>
              </div>
            </div>
          </div>

          <section className="grid gap-3 p-4 md:grid-cols-3">
            <StatusCard
              label="Mode"
              value="Premium"
              text="Interface orientée décision et efficacité du capital."
            />
            <StatusCard
              label="Source"
              value="Supabase"
              text="Données portefeuille, cash et vues décisionnelles."
            />
            <StatusCard
              label="Discipline"
              value="Wait / Buy"
              text="Achat uniquement si opportunité et prix cohérents."
            />
          </section>
        </header>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Navigation
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Modules Nexial
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Chaque module doit répondre à une question concrète :
                où est le capital, quel est le risque, quoi renforcer, quoi
                attendre, quoi exécuter.
              </p>
            </div>

            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">
                      {link.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {link.text}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-500 transition group-hover:border-blue-200 group-hover:text-blue-700">
                    Ouvrir
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Priorité produit"
            text="Fiabilité des prix, cohérence portefeuille, décision unique et alertes actionnables."
          />
          <Panel
            title="Règle d’exécution"
            text="Pas d’achat sur breakout. Priorité aux replis, aux zones d’achat et au contrôle qualité data."
          />
          <Panel
            title="Objectif UX"
            text="Une interface premium, claire, rapide à lire, qui donne immédiatement confiance."
          />
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function Panel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}