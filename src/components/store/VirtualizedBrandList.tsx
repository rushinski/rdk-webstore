// src/components/store/VirtualizedBrandList.tsx
// FIXED VERSION - Truly consistent spacing, all brands aligned
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

// Memoized brand item - FIXED: Exact same height for all brands
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
    <div className="w-full min-w-0">
      {/* FIXED: Exact same structure for ALL brands - py-2.5 spacing */}
      <div className="flex items-start gap-2 w-full min-w-0 py-2.5">
        <label className="flex items-start gap-3 text-sm text-gray-300 hover:text-white cursor-pointer flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onBrandChange(brand.value)}
            className="rdk-checkbox flex-shrink-0 mt-0.5"
            data-testid={`filter-brand-${toTestId(brand.value)}`}
          />
          <span className="flex-1 break-words min-w-0">{brand.label}</span>
        </label>

        {/* FIXED: Always render button container with exact same dimensions */}
        <button
          type="button"
          onClick={hasModels && showModels ? () => onToggleBrand(brand.value) : undefined}
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center ${
            hasModels && showModels 
              ? 'text-zinc-500 hover:text-white transition-colors cursor-pointer' 
              : 'invisible pointer-events-none'
          }`}
          aria-label={hasModels && showModels ? `Toggle ${brand.label} models` : undefined}
          disabled={!hasModels || !showModels}
        >
          {hasModels && showModels && <ToggleIcon open={isExpanded} />}
        </button>
      </div>

      {/* Models dropdown */}
      {hasModels && showModels && isExpanded && (
        <div className="ml-7 mb-2 space-y-2 border-l border-zinc-800/70 pl-3 w-full min-w-0">
          {models.map((model) => (
            <label
              key={model}
              className="flex items-start gap-3 text-sm text-gray-300 hover:text-white cursor-pointer w-full min-w-0"
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => onModelChange(model, brand.value)}
                className="rdk-checkbox flex-shrink-0 mt-0.5"
                data-testid={`filter-model-${toTestId(model)}`}
              />
              <span className="flex-1 text-xs break-words min-w-0">{model}</span>
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
    <div className="w-full min-w-0">
      {brands.length > 50 && (
        <div className="text-xs text-gray-500 mb-2 px-1">
          {brands.length} brands available
        </div>
      )}
      <div className="w-full min-w-0">
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
    </div>
  );
});