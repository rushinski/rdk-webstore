export function AdminSectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_50px_rgba(17,17,17,0.04)] sm:p-6">
      {title ? (
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
