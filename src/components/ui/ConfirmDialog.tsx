"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative w-full max-w-md border border-brand-border bg-brand-surface shadow-[0_24px_80px_rgba(17,17,17,0.12)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <h2
            id="confirm-title"
            className="text-lg font-semibold uppercase tracking-[0.08em] text-brand-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer text-brand-muted transition hover:text-brand-text"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {description && (
          <div className="px-5 py-4 text-sm text-brand-muted">{description}</div>
        )}
        <div className="flex justify-end gap-2 border-t border-brand-border px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className={adminButtonStyles.secondary}
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={adminButtonStyles.danger}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

