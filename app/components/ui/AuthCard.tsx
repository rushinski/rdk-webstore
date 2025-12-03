// app/components/ui/AuthCard.tsx
import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export default function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div
      className={
        "w-full max-w-md rounded-2xl bg-white/95 dark:bg-neutral-900/95 shadow-xl border border-neutral-200/60 dark:border-neutral-800/80 px-6 py-7 sm:px-8 sm:py-8 transition-all " +
        className
      }
    >
      {children}
    </div>
  );
}
