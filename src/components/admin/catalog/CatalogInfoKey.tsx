import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

const infoItems = [
  {
    label: "Brands",
    description: "Canonical brand labels used for products, filters, and parsing.",
  },
  {
    label: "Models",
    description:
      "Canonical sneaker model labels tied to a brand. Only used when category is sneakers.",
  },
  {
    label: "Aliases",
    description:
      "Alternate spellings or shorthand that map to brands or models and support parser matching.",
  },
  {
    label: "Alias Priority",
    description:
      "When multiple aliases match, higher priority wins over shorter or lower-priority matches.",
  },
  {
    label: "Candidates",
    description:
      "Unknown brands and models created during product entry. Accept them to add them to taxonomy.",
  },
  {
    label: "Verified",
    description:
      "Trusted entries that appear cleanly in storefront filters. Unverified is provisional.",
  },
  {
    label: "Active",
    description:
      "Active entries are used by the parser and UI. Inactive hides them without deleting.",
  },
  {
    label: "Title Parsing",
    description:
      "Titles are parsed into brand, model, and name. Brand is found first, then model for sneakers.",
  },
];

export function CatalogInfoKey() {
  return (
    <AdminSectionCard title="Info Key">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between border border-brand-border bg-brand-page px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text">
          <span>How The Catalog System Works</span>
          <span className="text-xs text-brand-muted group-open:hidden">Show</span>
          <span className="hidden text-xs text-brand-muted group-open:inline">Hide</span>
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="border border-brand-border bg-brand-page p-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
                {item.label}
              </div>
              <div className="mt-1 text-sm text-brand-text">{item.description}</div>
            </div>
          ))}
        </div>
      </details>
    </AdminSectionCard>
  );
}
