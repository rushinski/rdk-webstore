export function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_50px_rgba(17,17,17,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold text-brand-text">{value}</div>
      {detail ? <div className="mt-2 text-sm text-brand-muted">{detail}</div> : null}
    </div>
  );
}
