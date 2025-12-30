'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

const toneStyles: Record<ToastTone, string> = {
  success: 'border-l-4 border-l-green-500',
  error: 'border-l-4 border-l-red-500',
  info: 'border-l-4 border-l-zinc-600',
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
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm sm:max-w-xs">
      <div className={`bg-zinc-900 border border-zinc-800 ${toneStyles[tone]} px-4 py-3 shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="text-sm leading-snug text-gray-100">{message}</div>
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
