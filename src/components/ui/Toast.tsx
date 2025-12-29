'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

const toneStyles: Record<ToastTone, string> = {
  success: 'border-green-500 text-green-200',
  error: 'border-red-500 text-red-200',
  info: 'border-zinc-700 text-gray-200',
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
  tone = 'info',
  durationMs = 3200,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open || durationMs <= 0) return;
    const timer = setTimeout(() => onClose(), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className={`bg-zinc-900 border ${toneStyles[tone]} px-4 py-3 shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="text-sm leading-snug">{message}</div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
