import type {
  AcceptInput,
  ModifyInput,
  CancelInput,
  AcceptData,
  ModifyData,
  CancelData,
  ProposalApiError,
  ActionMetadata,
} from "@/lib/schemas/proposals";

// ═══════════════════════════════════════════════════════════════════
// Types Result<T> — discriminated union pour switch propre côté UI
// ═══════════════════════════════════════════════════════════════════

export type ProposalError = ProposalApiError | "NETWORK";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProposalError; details?: unknown; status?: number };

// ═══════════════════════════════════════════════════════════════════
// Helper interne — fetch + parse + erreurs normalisées
// ═══════════════════════════════════════════════════════════════════

async function callProposalApi<TData>(
  action: "accept" | "modify" | "cancel",
  payload: unknown
): Promise<Result<TData>> {
  let response: Response;
  try {
    response = await fetch(`/api/proposals/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { ok: false, error: "NETWORK", details: String(err) };
  }

  let json: { ok: boolean; data?: TData; error?: string; details?: unknown };
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      error: "INTERNAL",
      details: "Invalid JSON response from server",
      status: response.status,
    };
  }

  if (!json.ok) {
    return {
      ok: false,
      error: (json.error as ProposalError) ?? "INTERNAL",
      details: json.details,
      status: response.status,
    };
  }

  return { ok: true, data: json.data as TData };
}

// ═══════════════════════════════════════════════════════════════════
// API publique — 3 actions single-shot
// ═══════════════════════════════════════════════════════════════════

export function acceptProposals(input: AcceptInput): Promise<Result<AcceptData>> {
  return callProposalApi<AcceptData>("accept", input);
}

export function modifyProposal(input: ModifyInput): Promise<Result<ModifyData>> {
  return callProposalApi<ModifyData>("modify", input);
}

export function cancelProposal(input: CancelInput): Promise<Result<CancelData>> {
  return callProposalApi<CancelData>("cancel", input);
}

// ═══════════════════════════════════════════════════════════════════
// Bulk cancel — pour les boutons "Annuler" qui annulent N paliers d'un ticker
// ═══════════════════════════════════════════════════════════════════

export type BulkCancelResult = {
  succeeded: Array<{ proposal_id: string; data: CancelData }>;
  failed: Array<{ proposal_id: string; error: ProposalError; details?: unknown }>;
  total: number;
};

export async function cancelProposalsBulk(
  proposal_ids: string[],
  reason?: string,
  action_metadata?: ActionMetadata
): Promise<BulkCancelResult> {
  const results = await Promise.allSettled(
    proposal_ids.map((id) =>
      cancelProposal({
        proposal_id: id,
        reason,
        action_metadata,
      })
    )
  );

  const succeeded: BulkCancelResult["succeeded"] = [];
  const failed: BulkCancelResult["failed"] = [];

  results.forEach((result, idx) => {
    const id = proposal_ids[idx];
    if (result.status === "fulfilled") {
      if (result.value.ok) {
        succeeded.push({ proposal_id: id, data: result.value.data });
      } else {
        failed.push({
          proposal_id: id,
          error: result.value.error,
          details: result.value.details,
        });
      }
    } else {
      failed.push({
        proposal_id: id,
        error: "NETWORK",
        details: String(result.reason),
      });
    }
  });

  return { succeeded, failed, total: proposal_ids.length };
}

// ═══════════════════════════════════════════════════════════════════
// Helpers UX — messages utilisateur dérivés du code d'erreur
// ═══════════════════════════════════════════════════════════════════

export function errorToUserMessage(error: ProposalError): string {
  switch (error) {
    case "UNAUTHENTICATED":
      return "Session expirée. Reconnecte-toi.";
    case "FORBIDDEN":
      return "Action non autorisée pour ce compte.";
    case "VALIDATION":
      return "Données invalides. Vérifie le formulaire.";
    case "NETWORK":
      return "Problème de connexion. Réessaie dans un instant.";
    case "RPC_ERROR":
      return "Erreur côté base de données. Réessaie ou contacte le support.";
    case "AUTH_INTERNAL":
    case "INTERNAL":
    case "INVALID_JSON":
    case "UNKNOWN_ACTION":
    case "UNREACHABLE":
    default:
      return "Erreur interne. Réessaie ou contacte le support.";
  }
}
