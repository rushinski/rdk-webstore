import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-border py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-sm text-brand-muted">{label}</span>
      <span className="text-right text-sm text-brand-text">{children}</span>
    </div>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <AdminSectionCard title={title}>{children}</AdminSectionCard>;
}

function formatPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return "No payload";
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function PayloadBlock({ label, payload }: { label: string; payload: unknown }) {
  return (
    <div className="space-y-3 border border-brand-border bg-brand-page p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          {label}
        </p>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-brand-text">
        {formatPayload(payload)}
      </pre>
    </div>
  );
}

