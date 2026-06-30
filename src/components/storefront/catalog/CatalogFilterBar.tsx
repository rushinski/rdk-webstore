export function CatalogFilterBar() {
  const labels = ["BRAND", "SIZE", "CATEGORY", "CONDITION"];

  return (
    <div className="overflow-x-auto border-b border-brand-border bg-brand-surface px-6 md:px-12 lg:px-16">
      <div className="flex min-w-max items-center gap-6 py-3">
        {labels.map((label) => (
          <button
            key={label}
            type="button"
            className="border-b-2 border-transparent py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-text hover:border-brand-text"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
