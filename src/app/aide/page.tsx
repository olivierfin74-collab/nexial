import Link from "next/link";
import HelpTooltip from "@/components/HelpTooltip";
import { HELP_DEFINITIONS } from "@/lib/helpDefinitions";

export default function HelpPage() {
  const categories = Array.from(new Set(HELP_DEFINITIONS.map((definition) => definition.category)));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Nexial</p>
          <h1 className="font-serif text-4xl text-[#1F4A2E]">Aide</h1>
          <p className="mt-2 text-sm text-gray-600">Définitions rapides des concepts utilisés dans les alertes, zones et tableaux de bord.</p>
        </div>
        <Link href="/settings" className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
          Settings
        </Link>
      </div>

      <section className="mb-5 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <h2 className="font-serif text-2xl text-[#1F4A2E]">Tooltips inline</h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          Les termes techniques affichent une icone d'aide cliquable, par exemple{" "}
          <HelpTooltip id="z1-z2-z3" label="Z1 / Z2 / Z3" />,{" "}
          <HelpTooltip id="rsi-14" label="RSI 14" /> ou{" "}
          <HelpTooltip id="sizing-multiplier" label="Sizing multiplier" />.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <section key={category} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="font-serif text-2xl text-[#1F4A2E]">{category}</h2>
            <div className="mt-4 space-y-3">
              {HELP_DEFINITIONS.filter((definition) => definition.category === category).map((definition) => (
                <article key={definition.id} className="rounded-lg bg-[#FBF9F4] p-3">
                  <h3 className="font-bold text-gray-900">
                    {definition.term} <HelpTooltip id={definition.id} />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{definition.summary}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
