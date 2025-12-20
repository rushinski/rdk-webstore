// src/components/ui/Drawer.tsx
'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export function Drawer({ isOpen, onClose, title, children, side = 'right' }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`absolute top-0 bottom-0 ${
          side === 'right' ? 'right-0' : 'left-0'
        } w-full max-w-md bg-zinc-900 border-${
          side === 'right' ? 'l' : 'r'
        } border-red-900/20 overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-6 border-b border-red-900/20">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}