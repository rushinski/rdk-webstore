export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border border-brand-border bg-brand-page px-6 py-10 text-center">
      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text">
        {title}
      </div>
      {description ? (
        <p className="mt-2 text-sm text-brand-muted">{description}</p>
      ) : null}
    </div>
  );
}
