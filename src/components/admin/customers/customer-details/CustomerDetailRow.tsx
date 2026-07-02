"use client";

type CustomerDetailRowProps = {
  label: string;
  children: React.ReactNode;
};

export function CustomerDetailRow({ label, children }: CustomerDetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-border py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-sm text-brand-muted">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm text-brand-text [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  );
}
