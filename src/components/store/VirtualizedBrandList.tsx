// src/components/store/VirtualizedBrandList.tsx
"use client";

import { useMemo, useCallback, memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface Brand {
  value: string;
  label: string;
}

interface VirtualizedBrandListProps {
  brands: Brand[];
  selectedBrands: string[];
  expandedBrands: Record<string, boolean>;
  modelsByBrand: Record<string, string[]>;
  selectedModels: string[];
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string, brand?: string) => void;
  onToggleBrand: (brand: string) => void;
  showModelFilter: boolean;
}

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4" aria-hidden="true">
      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </span>
  );
}

// Memoized brand item to prevent unnecessary re-renders
const BrandItem = memo(function BrandItem({
  brand,
  isSelected,
  isExpanded,
  models,
  selectedModels,
  onBrandChange,
  onModelChange,
  onToggleBrand,
  showModels,
}: {
  brand: { value: string; label: string };
  isSelected: boolean;
  isExpanded: boolean;
  models: string[];
  selectedModels: string[];
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string, brand: string) => void;
  onToggleBrand: (brand: string) => void;
  showModels: boolean;
}) {
  const hasModels = models.length > 0;
  const toTestId = useCallback((value: string) => value.toLowerCase().replace(/\s+/g, "-"), []);

  return (
    <div className="py-1">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onBrandChange(brand.value)}
            className="rdk-checkbox flex-shrink-0"
            data-testid={`filter-brand-${toTestId(brand.value)}`}
          />
          <span className="truncate">{brand.label}</span>
        </label>

        {hasModels && showModels && (
          <button
            type="button"
            onClick={() => onToggleBrand(brand.value)}
            className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 p-1"
            aria-label={`Toggle ${brand.label} models`}
          >
            <ToggleIcon open={isExpanded} />
          </button>
        )}
      </div>

      {hasModels && showModels && isExpanded && (
        <div className="mt-2 ml-6 space-y-2 border-l border-zinc-800/70 pl-3">
          {models.map((model) => (
            <label
              key={model}
              className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-white cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => onModelChange(model, brand.value)}
                className="rdk-checkbox flex-shrink-0"
                data-testid={`filter-model-${toTestId(model)}`}
              />
              <span className="truncate text-xs">{model}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

export const VirtualizedBrandList = memo(function VirtualizedBrandList({
  brands,
  selectedBrands,
  expandedBrands,
  modelsByBrand,
  selectedModels,
  onBrandChange,
  onModelChange,
  onToggleBrand,
  showModelFilter,
}: VirtualizedBrandListProps) {
  // Sort models once and memoize
  const sortedModelsByBrand = useMemo(() => {
    if (!showModelFilter) return {};
    const out: Record<string, string[]> = {};
    for (const [brandKey, models] of Object.entries(modelsByBrand)) {
      out[brandKey] = [...(models ?? [])].sort((a, b) => a.localeCompare(b));
    }
    return out;
  }, [modelsByBrand, showModelFilter]);

  // FIXED: No max-height or internal scrolling - let parent handle it
  return (
    <div className="space-y-2">
      {brands.length > 50 && (
        <div className="text-xs text-gray-500 mb-2">
          {brands.length} brands available
        </div>
      )}
      {brands.map((brand) => {
        const brandKey = brand.value;
        const models = showModelFilter ? (sortedModelsByBrand[brandKey] ?? []) : [];
        const isExpanded = expandedBrands[brandKey] || selectedBrands.includes(brandKey);

        return (
          <BrandItem
            key={brandKey}
            brand={brand}
            isSelected={selectedBrands.includes(brandKey)}
            isExpanded={isExpanded}
            models={models}
            selectedModels={selectedModels}
            onBrandChange={onBrandChange}
            onModelChange={onModelChange}
            onToggleBrand={onToggleBrand}
            showModels={showModelFilter}
          />
        );
      })}
    </div>
  );
});