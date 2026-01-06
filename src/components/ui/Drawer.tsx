// src/components/ui/Drawer.tsx
'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  widthClassName?: string;
  zIndexClassName?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  side = 'right',
  widthClassName = 'max-w-md',
  zIndexClassName = 'z-[10000]',
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClass = side === 'right' ? 'right-0 border-l' : 'left-0 border-r';

  return (
    <div className={`fixed inset-0 ${zIndexClassName}`}>
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={[
          'absolute top-0 bottom-0',
          sideClass,
          'w-full',
          widthClassName,
          'bg-zinc-950 border-zinc-800/70 overflow-y-auto shadow-2xl',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-zinc-800/70">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {subtitle ? <p className="text-sm text-zinc-400 mt-1">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
