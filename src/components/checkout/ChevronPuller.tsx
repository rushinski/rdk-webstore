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
      className="absolute right-1/2 top-[-12px] z-10 inline-flex h-6 w-20 translate-x-1/2 items-center justify-center rounded-t-lg border border-brand-border border-b-0 bg-brand-surface"
      aria-label={isOpen ? "Collapse" : "Expand"}
    >
      <ChevronUp
        className={`h-5 w-5 text-brand-text transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
