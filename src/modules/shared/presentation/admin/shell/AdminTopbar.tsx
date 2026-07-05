// src/modules/shared/presentation/admin/shell/AdminTopbar.tsx

export function AdminTopbar() {
  return (
    <div className="mb-8 border-b border-brand-border bg-brand-surface px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold uppercase tracking-[0.08em] text-brand-text">
          solesneakers admin
        </h1>
        <p className="text-sm text-brand-muted">Operational control center</p>
      </div>
    </div>
  );
}
