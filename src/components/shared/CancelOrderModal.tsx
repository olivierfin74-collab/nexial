"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";

export type CancelOrderModalProposal = {
  proposal_id: string;
  ticker: string;
  rank?: number;
};

export type CancelOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: CancelOrderModalProposal[];
  onConfirm: (reason: string | null) => Promise<void>;
  titleSingle?: string;
  titlePlural?: string;
  description?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function CancelOrderModal({
  open,
  onOpenChange,
  proposals,
  onConfirm,
  titleSingle = "Annuler le palier",
  titlePlural = "Annuler les {n} paliers",
  description = "Cette annulation est définitive et sera tracée dans l'historique. Vous pouvez ajouter une raison pour la retrouver plus tard.",
  reasonLabel = "Raison (optionnel)",
  reasonPlaceholder = "Ex : conditions de marché changées, position ajustée ailleurs…",
  confirmLabel = "Confirmer l'annulation",
  cancelLabel = "Garder",
}: CancelOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const count = proposals.length;
  const title =
    count === 1
      ? titleSingle
      : titlePlural.replace("{n}", String(count));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const trimmed = reason.trim();
      await onConfirm(trimmed === "" ? null : trimmed);
    } finally {
      setLoading(false);
    }
  };

  // Liste compacte des tickers concernés
  const tickerSummary = (() => {
    const uniqueTickers = Array.from(new Set(proposals.map((p) => p.ticker)));
    if (uniqueTickers.length === 1) {
      const ticker = uniqueTickers[0];
      const ranks = proposals
        .map((p) => p.rank)
        .filter((r): r is number => r !== undefined)
        .sort((a, b) => a - b);
      if (ranks.length > 0 && ranks.length === count) {
        return `${ticker} · ${ranks.map((r) => `P${r}`).join(", ")}`;
      }
      return ticker;
    }
    return uniqueTickers.join(", ");
  })();

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o);
      }}
      title={title}
      description={description}
      variant="destructive"
      closeable={!loading}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-[#7A3838] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#612B2B] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#7A3838]/50"
          >
            {loading ? "Annulation…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-[#7A3838]/8 p-2.5 text-xs">
          <div className="text-gray-700">Concerne :</div>
          <div
            className="mt-0.5 font-medium text-gray-900"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {tickerSummary}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {reasonLabel}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            disabled={loading}
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-black/15 bg-white/60 px-3 py-2 text-sm transition-colors focus:border-[#7A3838] focus:outline-none focus:ring-2 focus:ring-[#7A3838]/30 disabled:opacity-50"
          />
          <div className="mt-1 text-right text-xs text-gray-500">
            {reason.length} / 500
          </div>
        </div>
      </div>
    </Modal>
  );
}
