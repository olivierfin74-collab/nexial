import type { OpportunityFeedItem } from "@/lib/opportunityFeed";

export type CioPosture = "WAIT" | "WATCH" | "PREPARE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type CioDecisionSnapshot = {
  generated_at: string;
  regime: string;
  risk_level: RiskLevel;
  suggested_posture: CioPosture;
  top_opportunities: OpportunityFeedItem[];
  explanation: string;
};

function riskLevel(regime: string, top: OpportunityFeedItem[]): RiskLevel {
  if (regime === "STRESS") return "HIGH";
  if (top.some((item) => item.priority === "CRITICAL")) return "HIGH";
  if (regime === "WEAK" || top.some((item) => item.priority === "HIGH")) return "MEDIUM";
  return "LOW";
}

function posture(regime: string, top: OpportunityFeedItem[]): CioPosture {
  if (regime === "STRESS") return "WAIT";
  if (top.some((item) => item.suggested_action === "PREPARE_LADDER")) return "PREPARE";
  if (top.length > 0) return "WATCH";
  return "WAIT";
}

function explanation(regime: string, risk: RiskLevel, postureValue: CioPosture, top: OpportunityFeedItem[]) {
  if (top.length === 0) {
    return `Regime ${regime}. No ranked opportunity is currently available. Posture: ${postureValue}. Risk: ${risk}.`;
  }

  const tickers = top.map((item) => `${item.ticker}:${item.priority}`).join(", ");
  return `Regime ${regime}. Top opportunities: ${tickers}. Posture: ${postureValue}. Risk: ${risk}. No final BUY decision generated.`;
}

export function buildCioDecisionSnapshot(
  regime: string,
  opportunities: OpportunityFeedItem[],
  generatedAt = new Date(),
): CioDecisionSnapshot {
  const top = opportunities.slice(0, 3);
  const risk = riskLevel(regime, top);
  const postureValue = posture(regime, top);

  return {
    generated_at: generatedAt.toISOString(),
    regime,
    risk_level: risk,
    suggested_posture: postureValue,
    top_opportunities: top,
    explanation: explanation(regime, risk, postureValue, top),
  };
}
