export function formatCurrency(
  value: number | null | undefined,
  currency = "EUR"
) {
  const safe = typeof value === "number" ? value : 0;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 2
) {
  const safe = typeof value === "number" ? value : 0;
  return `${safe.toFixed(digits)} %`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2
) {
  const safe = typeof value === "number" ? value : 0;

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safe);
}