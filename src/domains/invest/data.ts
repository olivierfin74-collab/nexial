import { createClient } from "@/lib/supabase/server";
import type { CashRow, InvestTargetRow } from "./types";

export async function getInvestModuleData() {
  const supabase = await createClient();

  const [{ data: targetsData, error: targetsError }, { data: cashData, error: cashError }] =
    await Promise.all([
      supabase
        .from("vw_arbitrage_targets_ranked_v2")
        .select("*")
        .order("target_rank", { ascending: true }),
      supabase
        .from("vw_account_cash_latest")
        .select("*")
        .order("account_name", { ascending: true }),
    ]);

  if (targetsError || cashError) {
    throw new Error(
      JSON.stringify(
        {
          targetsError,
          cashError,
        },
        null,
        2
      )
    );
  }

  return {
    targets: (targetsData ?? []) as InvestTargetRow[],
    cashRows: (cashData ?? []) as CashRow[],
  };
}