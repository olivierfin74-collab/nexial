export type HelpDefinition = {
  id: string;
  term: string;
  summary: string;
  category: "Zones" | "Technique" | "Alertes" | "Comptes" | "Pilotage";
};

export const HELP_DEFINITIONS: HelpDefinition[] = [
  {
    id: "z1-z2-z3",
    term: "Z1 / Z2 / Z3",
    category: "Zones",
    summary:
      "Zones d'achat. Z1 = premier palier, entree prudente a 40%. Z2 = palier moyen, renfort a 35%. Z3 = palier profond, dernier 25%. Elles combinent ATR et drawdown historique.",
  },
  {
    id: "rsi-14",
    term: "RSI 14",
    category: "Technique",
    summary:
      "Relative Strength Index sur 14 jours. Sous 30 = oversold et opportunite possible. Au-dessus de 70 = prudence. Au-dessus de 80 = surchauffe.",
  },
  {
    id: "ema-200",
    term: "EMA 200",
    category: "Technique",
    summary:
      "Moyenne mobile exponentielle 200 jours. Au-dessus = tendance long terme haussiere. En-dessous = tendance long terme baissiere.",
  },
  {
    id: "drawdown",
    term: "Drawdown",
    category: "Technique",
    summary: "Pourcentage de baisse depuis le plus haut sur 52 semaines.",
  },
  {
    id: "opportunity-score",
    term: "Opportunity score",
    category: "Pilotage",
    summary: "Score 0-100 combinant RSI, drawdown, ATR et momentum.",
  },
  {
    id: "alert-kind",
    term: "BUY_ZONE / FLASH_DROP / HOT_PULLBACK",
    category: "Alertes",
    summary:
      "Types d'alertes Nexial. BUY_ZONE signale une zone d'achat, FLASH_DROP une baisse rapide, HOT_PULLBACK un repli exploitable sur actif fort.",
  },
  {
    id: "pea-cto",
    term: "PEA / CTO",
    category: "Comptes",
    summary:
      "PEA = enveloppe fiscale francaise avec univers limite. CTO = compte-titres ordinaire, univers plus large mais fiscalite differente.",
  },
  {
    id: "sizing-multiplier",
    term: "Sizing multiplier",
    category: "Pilotage",
    summary:
      "Coefficient ajuste au regime de marche. x0.95 = sizing prudent. x1.2 = sizing offensif.",
  },
];

export function getHelpDefinition(id: string) {
  return HELP_DEFINITIONS.find((definition) => definition.id === id);
}
