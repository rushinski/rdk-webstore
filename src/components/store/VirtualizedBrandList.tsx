// src/components/store/VirtualizedBrandList.tsx
// FIXED VERSION - Width constraints, numerical sorting
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
    <span className="inline-flex items-center justify-center w-4 h-4 flex-shrink-0" aria-hidden="true">
      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </span>
  );
}

// Natural/numerical sorting for models
function naturalSort(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      const comparison = aPart.localeCompare(bPart);
      if (comparison !== 0) {
        return comparison;
      }
    }
  }
  
  return 0;
}

// Memoized brand item
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
    <div className="py-1 w-full">
      <div className="flex items-start gap-2 w-full">
        <label className="flex items-start gap-3 text-sm text-gray-300 hover:text-white cursor-pointer flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onBrandChange(brand.value)}
            className="rdk-checkbox flex-shrink-0 mt-0.5"
            data-testid={`filter-brand-${toTestId(brand.value)}`}
          />
          <span className="flex-1 break-words">{brand.label}</span>
        </label>

        {hasModels && showModels && (
          <button
            type="button"
            onClick={() => onToggleBrand(brand.value)}
            className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 p-1 mt-0.5"
            aria-label={`Toggle ${brand.label} models`}
          >
            <ToggleIcon open={isExpanded} />
          </button>
        )}
      </div>

      {hasModels && showModels && isExpanded && (
        <div className="mt-2 ml-7 space-y-2 border-l border-zinc-800/70 pl-3 w-full">
          {models.map((model) => (
            <label
              key={model}
              className="flex items-start gap-3 text-sm text-gray-300 hover:text-white cursor-pointer w-full"
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => onModelChange(model, brand.value)}
                className="rdk-checkbox flex-shrink-0 mt-0.5"
                data-testid={`filter-model-${toTestId(model)}`}
              />
              <span className="flex-1 text-xs break-words">{model}</span>
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
  // Sort models with natural/numerical sorting
  const sortedModelsByBrand = useMemo(() => {
    if (!showModelFilter) return {};
    const out: Record<string, string[]> = {};
    for (const [brandKey, models] of Object.entries(modelsByBrand)) {
      out[brandKey] = [...(models ?? [])].sort(naturalSort);
    }
    return out;
  }, [modelsByBrand, showModelFilter]);

  return (
    <div className="space-y-2 w-full">
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