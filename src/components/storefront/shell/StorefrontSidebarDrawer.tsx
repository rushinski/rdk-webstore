"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

type DrawerSectionKey = "brand" | "size" | "category" | null;

type ExpandableGroup = {
  label: string;
  items: string[];
};

const clothingSizes = [
  "XX-Small",
  "X-Small",
  "Small",
  "Medium",
  "Large",
  "X-Large",
  "XX-Large",
  "XXXL-Large",
];

const mensSizes = [
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "10.5",
  "11",
  "11.5",
  "12",
  "12.5",
  "13",
  "14",
];
const womensSizes = [
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "11",
];

function buildStoreHref(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/store?${searchParams.toString()}`;
}

export function StorefrontSidebarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<DrawerSectionKey>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "TOP BRANDS": true,
    "STREETWEAR BRANDS": false,
    "DESIGNER BRANDS": false,
    "SNEAKER BRANDS": true,
    CLOTHING: true,
    "MEN'S": true,
    "WOMEN'S": false,
    FOOTWEAR: true,
    ACCESSORIES: false,
  });

  const brandGroups = useMemo<ExpandableGroup[]>(
    () => [
      { label: "TOP BRANDS", items: ["Nike", "Air Jordan", "ASICS"] },
      { label: "STREETWEAR BRANDS", items: [] },
      { label: "DESIGNER BRANDS", items: [] },
      { label: "SNEAKER BRANDS", items: ["Nike", "Air Jordan", "ASICS"] },
    ],
    [],
  );

  const categoryGroups = useMemo<ExpandableGroup[]>(
    () => [
      { label: "FOOTWEAR", items: ["Sneakers"] },
      { label: "CLOTHING", items: ["Clothing"] },
      { label: "ACCESSORIES", items: ["Accessories", "Electronics"] },
    ],
    [],
  );

  if (!isOpen) {
    return null;
  }

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const baseItemClass =
    "flex items-center justify-between border-b border-brand-border px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-brand-text";

  const renderGroup = (group: ExpandableGroup, itemHref?: (item: string) => string) => (
    <div key={group.label} className="border-b border-brand-border">
      <button
        type="button"
        onClick={() => toggleGroup(group.label)}
        className="flex w-full items-center justify-between px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-brand-text"
      >
        <span>{group.label}</span>
        {openGroups[group.label] ? (
          <Minus className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
      {openGroups[group.label] && (
        <div className="px-6 pb-4">
          {group.items.length === 0 ? (
            <p className="text-sm text-brand-muted">
              {/* client fills later */}Coming soon
            </p>
          ) : (
            <div className="space-y-2">
              {group.items.map((item) => (
                <Link
                  key={item}
                  href={itemHref ? itemHref(item) : "/store"}
                  onClick={onClose}
                  className="block py-1 text-sm text-brand-text hover:underline"
                >
                  {item}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const secondaryPanel = (() => {
    if (activeSection === "brand") {
      return (
        <>
          <Link
            href="/brands"
            onClick={onClose}
            className="mb-4 block px-6 text-sm font-bold uppercase tracking-[0.12em] text-brand-text"
          >
            All Brands
          </Link>
          {brandGroups.map((group) =>
            renderGroup(group, (item) => buildStoreHref({ brand: item })),
          )}
        </>
      );
    }

    if (activeSection === "size") {
      return (
        <>
          {renderGroup({ label: "CLOTHING", items: clothingSizes }, (item) =>
            buildStoreHref({ category: "clothing", sizeClothing: item }),
          )}
          {renderGroup({ label: "MEN'S", items: mensSizes }, (item) =>
            buildStoreHref({ category: "sneakers", sizeShoe: item }),
          )}
          {renderGroup({ label: "WOMEN'S", items: womensSizes }, (item) =>
            buildStoreHref({ category: "sneakers", sizeShoe: item }),
          )}
        </>
      );
    }

    if (activeSection === "category") {
      return categoryGroups.map((group) =>
        renderGroup(group, (item) =>
          buildStoreHref({
            category:
              item === "Sneakers"
                ? "sneakers"
                : item === "Clothing"
                  ? "clothing"
                  : item === "Accessories"
                    ? "accessories"
                    : "electronics",
          }),
        ),
      );
    }

    return null;
  })();

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close navigation drawer"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-[760px] bg-brand-surface md:w-auto">
        <div className="relative w-full border-r border-brand-border bg-brand-surface md:w-[380px]">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 text-brand-text"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="pt-14">
            <Link
              href={buildStoreHref({ sort: "newest" })}
              onClick={onClose}
              className={baseItemClass}
            >
              <span>NEW ARRIVALS</span>
            </Link>
            <Link href="/store" onClick={onClose} className={baseItemClass}>
              <span>BEST SELLERS</span>
            </Link>
            <button
              type="button"
              onClick={() => setActiveSection("brand")}
              className={baseItemClass}
            >
              <span>SHOP BY BRAND</span>
              <ChevronRight className="h-4 w-4 text-brand-muted" />
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("size")}
              className={baseItemClass}
            >
              <span>SHOP BY SIZE</span>
              <ChevronRight className="h-4 w-4 text-brand-muted" />
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("category")}
              className={baseItemClass}
            >
              <span>SHOP BY CATEGORY</span>
              <ChevronRight className="h-4 w-4 text-brand-muted" />
            </button>
            <Link href="/store" onClick={onClose} className={baseItemClass}>
              <span>SHOP ALL</span>
            </Link>
          </div>
        </div>

        {activeSection ? (
          <div className="absolute inset-0 bg-brand-surface md:static md:w-[380px]">
            <div className="border-b border-brand-border px-6 py-5">
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-brand-muted md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
                {activeSection === "brand"
                  ? "SHOP BY BRAND"
                  : activeSection === "size"
                    ? "SHOP BY SIZE"
                    : "SHOP BY CATEGORY"}
              </div>
            </div>
            <div className="max-h-full overflow-y-auto py-4">{secondaryPanel}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
