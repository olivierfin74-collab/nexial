"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "nexial_guided_tour_v1_done";
const EXCLUDED_PREFIXES = ["/login", "/reset-password", "/update-password", "/auth", "/onboarding"];

const STEPS = [
  {
    title: "Tableau de bord",
    body: "Commence par Aujourd'hui pour voir les decisions prioritaires, les alertes et le contexte portefeuille.",
  },
  {
    title: "Zones Z1 / Z2 / Z3",
    body: "Les zones decoupent une entree en paliers progressifs pour eviter d'acheter toute la ligne au meme prix.",
  },
  {
    title: "Score et indicateurs",
    body: "Le score combine RSI 14, drawdown, ATR et momentum pour classer les opportunites.",
  },
  {
    title: "Alertes Nexial",
    body: "BUY_ZONE, FLASH_DROP et HOT_PULLBACK indiquent pourquoi une action remonte dans les priorites.",
  },
  {
    title: "Brief CIO",
    body: "Le brief CIO synthetise regime de marche, risques portefeuille, cash deployment et recommandation du jour.",
  },
  {
    title: "Aide et preferences",
    body: "Retrouve toutes les definitions dans Aide depuis Settings, puis ajuste tes notifications et comportements.",
  },
];

export default function GuidedOnboardingTour() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);

  const excluded = useMemo(
    () => EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
    [pathname],
  );

  useEffect(() => {
    if (excluded) return;
    const done = window.localStorage.getItem(STORAGE_KEY) === "true";
    setReady(!done);
  }, [excluded]);

  if (!ready || excluded) return null;

  const current = STEPS[step];
  const finish = () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setReady(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <section className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tutoriel Nexial</p>
            <h2 className="mt-1 font-serif text-2xl text-[#1F4A2E]">{current.title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Fermer le tutoriel"
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-6 text-gray-700">{current.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-gray-500">Etape {step + 1}/{STEPS.length}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={step === STEPS.length - 1 ? finish : () => setStep((value) => value + 1)}
              className="rounded-lg bg-[#1F4A2E] px-4 py-2 text-sm font-semibold text-white"
            >
              {step === STEPS.length - 1 ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
