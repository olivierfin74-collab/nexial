"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ConfirmOrderModal,
  type ConfirmOrderModalProposal,
} from "@/components/shared/ConfirmOrderModal";
import {
  EditOrderModal,
  type EditOrderModalProposal,
} from "@/components/shared/EditOrderModal";
import {
  CancelOrderModal,
  type CancelOrderModalProposal,
} from "@/components/shared/CancelOrderModal";
import {
  acceptProposals,
  modifyProposal,
  cancelProposalsBulk,
  errorToUserMessage,
} from "@/lib/actions/proposals";
import type { ModifyInput } from "@/lib/schemas/proposals";

export type Surface = "mobile" | "desktop";

export type OpenConfirmOptions = {
  source_button_id: string;
  source_page?: string;
  onSuccess?: () => void | Promise<void>;
};

export type OpenEditOptions = {
  source_button_id: string;
  source_page?: string;
  onSuccess?: () => void | Promise<void>;
};

export type OpenCancelOptions = {
  source_button_id: string;
  source_page?: string;
  onSuccess?: () => void | Promise<void>;
};

type ConfirmModalState = {
  type: "confirm";
  proposals: ConfirmOrderModalProposal[];
  options: OpenConfirmOptions;
} | null;

type EditModalState = {
  type: "edit";
  proposal: EditOrderModalProposal;
  options: OpenEditOptions;
} | null;

type CancelModalState = {
  type: "cancel";
  proposals: CancelOrderModalProposal[];
  options: OpenCancelOptions;
} | null;

export function useProposalActions({ surface }: { surface: Surface }) {
  const [confirmState, setConfirmState] = useState<ConfirmModalState>(null);
  const [editState, setEditState] = useState<EditModalState>(null);
  const [cancelState, setCancelState] = useState<CancelModalState>(null);

  const openConfirm = useCallback(
    (proposals: ConfirmOrderModalProposal[], options: OpenConfirmOptions) => {
      setConfirmState({ type: "confirm", proposals, options });
    },
    []
  );

  const openEdit = useCallback(
    (proposal: EditOrderModalProposal, options: OpenEditOptions) => {
      setEditState({ type: "edit", proposal, options });
    },
    []
  );

  const openCancel = useCallback(
    (proposals: CancelOrderModalProposal[], options: OpenCancelOptions) => {
      setCancelState({ type: "cancel", proposals, options });
    },
    []
  );

  const handleConfirmAccept = useCallback(async () => {
    if (!confirmState) return;
    const { proposals, options } = confirmState;
    const result = await acceptProposals({
      proposal_ids: proposals.map((p) => p.proposal_id),
      action_metadata: {
        surface,
        source_button_id: options.source_button_id,
        source_page: options.source_page,
      },
    });

    if (!result.ok) {
      toast.error(errorToUserMessage(result.error));
      return;
    }

    const { accepted_count, skipped } = result.data;
    if (accepted_count === proposals.length) {
      toast.success(
        accepted_count === 1
          ? "Palier validé"
          : `${accepted_count} paliers validés`
      );
    } else if (accepted_count > 0) {
      toast.warning(
        `${accepted_count} sur ${proposals.length} paliers validés. ${skipped.length} ignorés.`
      );
    } else {
      toast.error("Aucun palier validé. Vérifiez l'état des propositions.");
    }

    setConfirmState(null);
    if (options.onSuccess) await options.onSuccess();
  }, [confirmState, surface]);

  const handleEditConfirm = useCallback(
    async (patch: ModifyInput["patch"]) => {
      if (!editState) return;
      const { proposal, options } = editState;
      const result = await modifyProposal({
        proposal_id: proposal.proposal_id,
        patch,
        action_metadata: {
          surface,
          source_button_id: options.source_button_id,
          source_page: options.source_page,
        },
      });

      if (!result.ok) {
        toast.error(errorToUserMessage(result.error));
        return;
      }

      toast.success("Palier modifié");
      setEditState(null);
      if (options.onSuccess) await options.onSuccess();
    },
    [editState, surface]
  );

  const handleCancelConfirm = useCallback(
    async (reason: string | null) => {
      if (!cancelState) return;
      const { proposals, options } = cancelState;
      const result = await cancelProposalsBulk(
        proposals.map((p) => p.proposal_id),
        reason ?? undefined,
        {
          surface,
          source_button_id: options.source_button_id,
          source_page: options.source_page,
        }
      );

      const { succeeded, failed, total } = result;
      if (succeeded.length === total) {
        toast.success(
          total === 1 ? "Palier annulé" : `${total} paliers annulés`
        );
      } else if (succeeded.length > 0) {
        toast.warning(
          `${succeeded.length} sur ${total} paliers annulés. ${failed.length} en échec.`
        );
      } else {
        const firstError = failed[0]?.error ?? "INTERNAL";
        toast.error(errorToUserMessage(firstError));
      }

      setCancelState(null);
      if (options.onSuccess) await options.onSuccess();
    },
    [cancelState, surface]
  );

  const ProposalActionModals = useCallback(
    () => (
      <>
        <ConfirmOrderModal
          open={confirmState !== null}
          onOpenChange={(o) => !o && setConfirmState(null)}
          proposals={confirmState?.proposals ?? []}
          onConfirm={handleConfirmAccept}
        />
        <EditOrderModal
          open={editState !== null}
          onOpenChange={(o) => !o && setEditState(null)}
          proposal={editState?.proposal ?? null}
          onConfirm={handleEditConfirm}
        />
        <CancelOrderModal
          open={cancelState !== null}
          onOpenChange={(o) => !o && setCancelState(null)}
          proposals={cancelState?.proposals ?? []}
          onConfirm={handleCancelConfirm}
        />
      </>
    ),
    [
      confirmState,
      editState,
      cancelState,
      handleConfirmAccept,
      handleEditConfirm,
      handleCancelConfirm,
    ]
  );

  return {
    openConfirm,
    openEdit,
    openCancel,
    ProposalActionModals,
  };
}
