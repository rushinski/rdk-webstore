export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-brand-border pb-5">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.08em] text-brand-text">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-brand-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
