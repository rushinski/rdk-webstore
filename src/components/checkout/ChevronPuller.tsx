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
      className="absolute -top-4 right-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80"
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
