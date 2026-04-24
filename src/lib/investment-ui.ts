export function getDecisionTone(decision: string | null | undefined) {
  switch (decision) {
    case "BUY":
      return "good";
    case "HOLD":
      return "info";
    case "REDUCE":
      return "warn";
    case "SELL":
      return "bad";
    default:
      return "default";
  }
}

export function getZoneTone(zone: string | null | undefined) {
  switch (zone) {
    case "Z3":
      return "good";
    case "Z2":
      return "info";
    case "Z1":
      return "warn";
    default:
      return "default";
  }
}

export function getMomentumTone(momentum: string | null | undefined) {
  switch (momentum) {
    case "strong":
      return "good";
    case "positive":
      return "info";
    case "weak":
      return "bad";
    default:
      return "default";
  }
}