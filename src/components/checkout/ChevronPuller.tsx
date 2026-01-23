"use client";

import { ChevronUp } from "lucide-react";

interface ChevronPullerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ChevronPuller({ isOpen, setIsOpen }: ChevronPullerProps) {
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="absolute -top-3 right-1/2 translate-x-1/2 z-10 inline-flex items-center justify-center w-20 h-6 rounded-t-lg bg-zinc-950/95 border-t border-zinc-800"
      aria-label={isOpen ? "Collapse" : "Expand"}
    >
      <ChevronUp
        className={`w-5 h-5 text-white transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
