"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { getHelpDefinition } from "@/lib/helpDefinitions";

type HelpTooltipProps = {
  id: string;
  label?: string;
};

export default function HelpTooltip({ id, label }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const definition = useMemo(() => getHelpDefinition(id), [id]);

  if (!definition) return label ? <span>{label}</span> : null;

  return (
    <span className="relative inline-flex items-center gap-1 align-middle">
      {label && <span>{label}</span>}
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Definition ${definition.term}`}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className="inline-grid h-5 w-5 place-items-center rounded-full border border-[#1F4A2E]/30 bg-[#DDE9D8] text-[#1F4A2E]"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-0 top-7 z-30 w-72 rounded-lg border border-black/10 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg">
          <span className="block font-bold text-[#1F4A2E]">{definition.term}</span>
          <span className="mt-1 block">{definition.summary}</span>
        </span>
      )}
    </span>
  );
}
