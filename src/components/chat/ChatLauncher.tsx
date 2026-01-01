// src/components/chat/ChatLauncher.tsx
'use client';

import { MessageCircle } from 'lucide-react';

export function ChatLauncher() {
  const handleOpen = () => window.dispatchEvent(new CustomEvent('openChat'));

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 bg-red-600 text-white px-1 py-3 shadow-lg border border-red-700 z-40"
        aria-label="Chat with us"
      >
        <span className="flex items-center gap-1.5 -rotate-90 whitespace-nowrap text-[11px] font-semibold">
          <MessageCircle className="w-3.5 h-3.5" />
          Chat with us
        </span>
      </button>

      <button
        type="button"
        onClick={handleOpen}
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 items-center justify-center bg-red-600 text-white shadow-lg border border-red-700 z-40"
        aria-label="Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
}
