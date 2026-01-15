// src/components/ui/ModalPortal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClassName?: string; // default z-[9999]
};

export function ModalPortal({ open, onClose, children, zIndexClassName = "z-[9999]" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // optional: lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClassName}`}>
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>,
    document.body,
  );
}
