// src/components/ui/Accordion.tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-red-900/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-white hover:text-gray-300 transition"
      >
        <span className="font-semibold">{title}</span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-4 text-gray-400">{children}</div>}
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
}

export function Accordion({ children }: AccordionProps) {
  return <div className="space-y-0">{children}</div>;
}