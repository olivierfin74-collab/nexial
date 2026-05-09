"use client";

import { useState } from "react";
import { Modal } from "./Modal";

export type ConfirmOrderModalProposal = {
  proposal_id: string;
  ticker: string;
  proposed_price: number;
  proposed_quantity: number;
  proposed_currency: string;
  rank?: number;
};

export type ConfirmOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: ConfirmOrderModalProposal[];
  onConfirm: () => Promise<void>;
  titleSingle?: string;
  titlePlural?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmOrderModal({
  open,
  onOpenChange,
  proposals,
  onConfirm,
  titleSingle = "Valider le palier",
  titlePlural = "Valider les {n} paliers",
  description = "Cette action enregistrera l'acceptation. Vous resterez responsable du passage de l'ordre auprès de votre broker (sauf compte automatisé).",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
}: ConfirmOrderModalProps) {
  const [loading, setLoading] = useState(false);

  const count = proposals.length;
  const title =
    count === 1
      ? titleSingle
      : titlePlural.replace("{n}", String(count));

  const fmtMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  const totalAmount = proposals.reduce(
    (sum, p) => sum + p.proposed_price * p.proposed_quantity,
    0
  );

  const allSameCurrency =
    count > 0 &&
    proposals.every((p) => p.proposed_currency === proposals[0].proposed_currency);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const showRank = proposals.some((p) => p.rank !== undefined);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o);
      }}
      title={title}
      description={description}
      variant="default"
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
            autoFocus
            className="rounded-lg bg-[#2D5F3F] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#234D32] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#2D5F3F]/50"
          >
            {loading ? "Validation…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="rounded-lg border border-black/10 bg-white/40 p-3">
        <table
          className="w-full text-xs"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <thead>
            <tr className="border-b border-black/10 text-left text-gray-500">
              {showRank && <th className="pb-2 pr-2 font-normal">Rang</th>}
              <th className="pb-2 pr-2 font-normal">Ticker</th>
              <th className="pb-2 pr-2 font-normal text-right">Prix</th>
              <th className="pb-2 pr-2 font-normal text-right">Qté</th>
              <th className="pb-2 font-normal text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr
                key={p.proposal_id}
                className="border-b border-black/5 last:border-0"
              >
                {showRank && (
                  <td className="py-2 pr-2 text-gray-600">
                    {p.rank !== undefined ? `P${p.rank}` : "—"}
                  </td>
                )}
                <td className="py-2 pr-2 font-medium">{p.ticker}</td>
                <td className="py-2 pr-2 text-right">
                  {fmtMoney(p.proposed_price, p.proposed_currency)}
                </td>
                <td className="py-2 pr-2 text-right">{p.proposed_quantity}</td>
                <td className="py-2 text-right font-medium">
                  {fmtMoney(
                    p.proposed_price * p.proposed_quantity,
                    p.proposed_currency
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {count > 1 && allSameCurrency && (
          <div className="mt-3 flex justify-between border-t border-black/10 pt-3 text-sm">
            <span className="text-gray-600">Total</span>
            <span
              className="font-medium"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {fmtMoney(totalAmount, proposals[0].proposed_currency)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
