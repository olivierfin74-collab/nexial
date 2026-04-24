import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type InvestResponse = {
  ok: boolean;
  mode: "REAL" | "SIMULATION";
  message: string;
  summary: {
    totalCashAvailable: number;
    suggestedAllocation: number;
    proposedLines: number;
  };
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    brokerCode: string;
    totalPositionsValue: number;
    totalCash: number;
    totalPortfolioValue: number;
    nbLines: number;
  }>;
  suggestions: Array<{
    ticker: string;
    assetName: string;
    accountType: string;
    brokerCode: string;
    marketValue: number;
    quantity: number;
    marketPrice: number;
    currency: string;
  }>;
  error?: string;
};

function buildSimulationResponse(): InvestResponse {
  return {
    ok: true,
    mode: "SIMULATION",
    message:
      "Aucun portefeuille réel rattaché à cet utilisateur pour le moment. Retour en mode simulation.",
    summary: {
      totalCashAvailable: 0,
      suggestedAllocation: 0,
      proposedLines: 0,
    },
    accounts: [],
    suggestions: [],
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json<InvestResponse>({
        ok: false,
        mode: "SIMULATION",
        message: "Impossible de récupérer l’utilisateur connecté.",
        summary: {
          totalCashAvailable: 0,
          suggestedAllocation: 0,
          proposedLines: 0,
        },
        accounts: [],
        suggestions: [],
        error: userError.message,
      });
    }

    if (!user) {
      return NextResponse.json<InvestResponse>(buildSimulationResponse());
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("vw_portfolio_accounts_summary_v1")
      .select("*")
      .eq("user_id", user.id)
      .order("account_name", { ascending: true });

    if (accountsError) {
      return NextResponse.json<InvestResponse>({
        ok: false,
        mode: "SIMULATION",
        message: "Erreur lors du chargement des comptes portefeuille.",
        summary: {
          totalCashAvailable: 0,
          suggestedAllocation: 0,
          proposedLines: 0,
        },
        accounts: [],
        suggestions: [],
        error: accountsError.message,
      });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json<InvestResponse>(buildSimulationResponse());
    }

    const { data: positions, error: positionsError } = await supabase
      .from("vw_portfolio_positions_core_v2")
      .select("*")
      .eq("user_id", user.id)
      .order("market_value", { ascending: false });

    if (positionsError) {
      return NextResponse.json<InvestResponse>({
        ok: false,
        mode: "SIMULATION",
        message: "Erreur lors du chargement des positions portefeuille.",
        summary: {
          totalCashAvailable: 0,
          suggestedAllocation: 0,
          proposedLines: 0,
        },
        accounts: [],
        suggestions: [],
        error: positionsError.message,
      });
    }

    const normalizedAccounts = (accounts ?? []).map((row: any) => ({
      accountId: row.account_id,
      accountName: row.account_name,
      accountType: row.account_type,
      brokerCode: row.broker_code,
      totalPositionsValue: Number(row.total_positions_value ?? 0),
      totalCash: Number(row.total_cash ?? 0),
      totalPortfolioValue: Number(row.total_portfolio_value ?? 0),
      nbLines: Number(row.nb_lines ?? 0),
    }));

    const totalCashAvailable = normalizedAccounts.reduce(
      (sum, a) => sum + a.totalCash,
      0
    );

    const suggestedAllocation = totalCashAvailable;

    const normalizedSuggestions = (positions ?? []).slice(0, 3).map((row: any) => ({
      ticker: row.ticker,
      assetName: row.asset_name,
      accountType: row.account_type,
      brokerCode: row.broker_code,
      marketValue: Number(row.market_value ?? 0),
      quantity: Number(row.quantity ?? 0),
      marketPrice: Number(row.market_price ?? 0),
      currency: String(row.currency ?? "EUR"),
    }));

    return NextResponse.json<InvestResponse>({
      ok: true,
      mode: "REAL",
      message: "Données portefeuille chargées avec succès.",
      summary: {
        totalCashAvailable,
        suggestedAllocation,
        proposedLines: normalizedSuggestions.length,
      },
      accounts: normalizedAccounts,
      suggestions: normalizedSuggestions,
    });
  } catch (error: any) {
    return NextResponse.json<InvestResponse>({
      ok: false,
      mode: "SIMULATION",
      message: "Erreur inattendue sur /api/invest.",
      summary: {
        totalCashAvailable: 0,
        suggestedAllocation: 0,
        proposedLines: 0,
      },
      accounts: [],
      suggestions: [],
      error: error?.message ?? "Unknown error",
    });
  }
}