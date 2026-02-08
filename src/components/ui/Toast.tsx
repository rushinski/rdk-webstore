"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

const toneStyles: Record<ToastTone, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-zinc-900 text-white",
};

interface ToastProps {
  open: boolean;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  onClose: () => void;
}

export function Toast({
  open,
  message,
  tone = "info",
  durationMs = 3200,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open || durationMs <= 0) {
      return;
    }
    const timer = setTimeout(() => onClose(), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 w-fit max-w-[calc(100vw-2rem)] sm:right-6 sm:max-w-xs">
      <div
        className={`bg-zinc-900 border border-zinc-800 ${toneStyles[tone]} px-4 py-3 shadow-lg`}
      >
        <div className="flex items-start gap-3">
          <div className="text-sm leading-snug">{message}</div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
