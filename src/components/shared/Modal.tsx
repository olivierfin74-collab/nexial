"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type ModalVariant = "default" | "destructive";

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: ModalVariant;
  children: ReactNode;
  footer?: ReactNode;
  closeable?: boolean;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  children,
  footer,
  closeable = true,
}: ModalProps) {
  const accentColor = variant === "destructive" ? "#7A3838" : "#2D5F3F";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#FBF9F4] p-6 shadow-2xl outline-none transition-all duration-200 data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95"
          onInteractOutside={(e) => {
            if (!closeable) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (!closeable) e.preventDefault();
          }}
        >
          <div
            className="absolute left-0 top-6 bottom-6 w-1 rounded-r"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />

          {closeable && (
            <Dialog.Close
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D5F3F]/30"
              aria-label="Fermer"
            >
              <X size={18} />
            </Dialog.Close>
          )}

          <div className="mb-5 pl-3 pr-8">
            <Dialog.Title
              className="font-serif text-xl leading-tight text-gray-900"
              style={{ fontFamily: "'Fraunces', 'Tobias', serif" }}
            >
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {description}
              </Dialog.Description>
            )}
          </div>

          <div className="pl-3 pr-1 text-sm text-gray-800">{children}</div>

          {footer && (
            <div className="mt-6 flex justify-end gap-2 pl-3 pr-1">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
