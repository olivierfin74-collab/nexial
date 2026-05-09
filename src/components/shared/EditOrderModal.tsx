"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import type { ModifyInput } from "@/lib/schemas/proposals";

export type EditOrderModalProposal = {
  proposal_id: string;
  ticker: string;
  proposed_price: number;
  proposed_quantity: number;
  proposed_currency: string;
  expires_at: string;
  user_price: number | null;
  user_quantity: number | null;
  user_note: string | null;
};

export type EditOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: EditOrderModalProposal | null;
  onConfirm: (patch: ModifyInput["patch"]) => Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function EditOrderModal({
  open,
  onOpenChange,
  proposal,
  onConfirm,
  title = "Modifier le palier",
  description = "Ajustez le prix limite, la quantité ou la date d'expiration. Les champs vides conservent la valeur actuelle.",
  confirmLabel = "Enregistrer",
  cancelLabel = "Annuler",
}: EditOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (open && proposal) {
      setPrice(String(proposal.user_price ?? proposal.proposed_price));
      setQuantity(String(proposal.user_quantity ?? proposal.proposed_quantity));
      const d = new Date(proposal.expires_at);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setExpiresAt(localISO);
      setNote(proposal.user_note ?? "");
      setErrors({});
    }
  }, [open, proposal]);

  if (!proposal) return null;

  const validateAndBuildPatch = (): {
    valid: boolean;
    patch: ModifyInput["patch"];
    errs: Record<string, string>;
  } => {
    const errs: Record<string, string> = {};
    const patch: ModifyInput["patch"] = {};

    const priceNum = parseFloat(price);
    if (price.trim() !== "") {
      if (isNaN(priceNum) || priceNum <= 0) {
        errs.price = "Prix invalide (doit être positif)";
      } else if (priceNum !== proposal.proposed_price) {
        patch.user_price = priceNum;
      }
    }

    const qtyNum = parseFloat(quantity);
    if (quantity.trim() !== "") {
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errs.quantity = "Quantité invalide (doit être positive)";
      } else if (qtyNum !== proposal.proposed_quantity) {
        patch.user_quantity = qtyNum;
      }
    }

    if (expiresAt) {
      const exp = new Date(expiresAt);
      if (isNaN(exp.getTime())) {
        errs.expires = "Date invalide";
      } else if (exp.getTime() <= Date.now()) {
        errs.expires = "La date d'expiration doit être future";
      } else {
        const originalExp = new Date(proposal.expires_at).getTime();
        if (exp.getTime() !== originalExp) {
          patch.expires_at = exp.toISOString();
        }
      }
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > 500) {
      errs.note = "Note trop longue (max 500 caractères)";
    } else if (trimmedNote !== (proposal.user_note ?? "")) {
      if (trimmedNote !== "") {
        patch.user_note = trimmedNote;
      }
    }

    if (Object.keys(patch).length === 0 && Object.keys(errs).length === 0) {
      errs._global = "Modifiez au moins un champ avant d'enregistrer";
    }

    return {
      valid: Object.keys(errs).length === 0,
      patch,
      errs,
    };
  };

  const handleConfirm = async () => {
    const { valid, patch, errs } = validateAndBuildPatch();
    if (!valid) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await onConfirm(patch);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-lg border bg-white/60 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50";
  const inputOk =
    "border-black/15 focus:border-[#2D5F3F] focus:ring-[#2D5F3F]/30";
  const inputErr =
    "border-[#7A3838] focus:border-[#7A3838] focus:ring-[#7A3838]/30";

  const fmtMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

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
            className="rounded-lg bg-[#2D5F3F] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#234D32] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#2D5F3F]/50"
          >
            {loading ? "Enregistrement…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-black/5 p-2.5 text-xs text-gray-700">
          <span className="font-medium">{proposal.ticker}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Initial : {proposal.proposed_quantity} ×{" "}
            {fmtMoney(proposal.proposed_price, proposal.proposed_currency)}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Prix limite ({proposal.proposed_currency})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={loading}
            className={`${inputBase} ${errors.price ? inputErr : inputOk}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          {errors.price && (
            <p className="mt-1 text-xs text-[#7A3838]">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Quantité
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={loading}
            className={`${inputBase} ${errors.quantity ? inputErr : inputOk}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-[#7A3838]">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Expire le
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={loading}
            className={`${inputBase} ${errors.expires ? inputErr : inputOk}`}
          />
          {errors.expires && (
            <p className="mt-1 text-xs text-[#7A3838]">{errors.expires}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Note (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            rows={2}
            maxLength={500}
            className={`${inputBase} resize-none ${errors.note ? inputErr : inputOk}`}
          />
          {errors.note && (
            <p className="mt-1 text-xs text-[#7A3838]">{errors.note}</p>
          )}
        </div>

        {errors._global && (
          <p className="rounded-md bg-[#7A3838]/8 px-2 py-1.5 text-xs text-[#7A3838]">
            {errors._global}
          </p>
        )}
      </div>
    </Modal>
  );
}
