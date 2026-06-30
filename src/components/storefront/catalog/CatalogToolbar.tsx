interface CatalogToolbarProps {
  browseLabel: string;
  total: number;
}

export function CatalogToolbar({ browseLabel, total }: CatalogToolbarProps) {
  return (
    <div className="bg-brand-page">
      <div className="px-6 pt-4 text-xs uppercase tracking-[0.15em] text-brand-muted md:px-12 lg:px-16">
        HOME / SHOP / {browseLabel}
      </div>
      <h1 className="py-10 text-center text-3xl font-black uppercase tracking-[0.15em] text-brand-text">
        {browseLabel}
      </h1>
      <div className="border-y border-brand-border bg-brand-surface px-6 py-4 md:px-12 lg:px-16">
        <div className="text-center text-xs font-bold uppercase tracking-[0.15em] text-brand-muted">
          {total} PRODUCTS
        </div>
      </div>
    </div>
  );
}
