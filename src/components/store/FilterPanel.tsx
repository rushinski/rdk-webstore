// src/components/store/FilterPanel.tsx
// OPTIMIZED VERSION - Debouncing and performance improvements
"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, Filter } from "lucide-react";

import {
  SHOE_SIZE_GROUPS,
  CLOTHING_SIZES,
  EU_SIZE_ALIASES,
  expandShoeSizeSelection,
  isEuShoeSize,
} from "@/config/constants/sizes";

type BrandOption = { label: string; value: string };

const NON_BRAND_CATEGORIES = new Set(["accessories", "electronics"]);

interface FilterPanelProps {
  selectedCategories: string[];
  selectedBrands: string[];
  selectedModels: string[];
  selectedShoeSizes: string[];
  selectedClothingSizes: string[];
  selectedConditions: string[];
  categories: string[];
  brands: BrandOption[];
  modelsByBrand: Record<string, string[]>;
  brandsByCategory: Record<string, string[]>;
  availableShoeSizes: string[];
  availableClothingSizes: string[];
  availableConditions: string[];
}

export function FilterPanel({
  selectedCategories,
  selectedBrands,
  selectedModels,
  selectedShoeSizes,
  selectedClothingSizes,
  selectedConditions,
  brands,
  modelsByBrand,
  brandsByCategory,
  categories,
  availableShoeSizes,
  availableClothingSizes,
  availableConditions,
}: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // OPTIMIZATION 1: Use useTransition for non-blocking updates
  const [isPending, startTransition] = useTransition();
  
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    size: true,
    condition: true,
  });
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // OPTIMIZATION 2: Memoize expensive computations
  const orderedCategories = useMemo(() => {
    const priority = ["sneakers", "clothing", "accessories", "electronics"];
    const ordered = priority.filter((cat) => categories.includes(cat));
    const remaining = categories
      .filter((cat) => !priority.includes(cat))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }, [categories]);

  const naturalCollator = useMemo(
    () => new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    }),
    []
  );

  const naturalCompare = useCallback(
    (a: string, b: string) => naturalCollator.compare(a, b),
    [naturalCollator]
  );

  const CONDITIONS = useMemo(() => ["new", "used"] as const, []);
  const toTestId = useCallback(
    (value: string) => value.toLowerCase().replace(/\s+/g, "-"),
    []
  );

  const availableShoeSizeSet = useMemo(() => {
    const expanded = new Set(availableShoeSizes);
    availableShoeSizes.forEach((size) => {
      if (!isEuShoeSize(size)) {
        return;
      }
      (EU_SIZE_ALIASES[size] ?? []).forEach((usSize) => expanded.add(usSize));
    });
    return expanded;
  }, [availableShoeSizes]);

  const expandedSelectedShoeSizes = useMemo(
    () => expandShoeSizeSelection(selectedShoeSizes),
    [selectedShoeSizes],
  );

  const expandedSelectedShoeSizeSet = useMemo(
    () => new Set(expandedSelectedShoeSizes),
    [expandedSelectedShoeSizes],
  );

  const availableClothingSizeSet = useMemo(
    () => new Set(availableClothingSizes),
    [availableClothingSizes],
  );

  const shoeSizeGroups = useMemo(
    () => ({
      youth: SHOE_SIZE_GROUPS.youth.filter((size) => availableShoeSizeSet.has(size)),
      mens: SHOE_SIZE_GROUPS.mens.filter((size) => availableShoeSizeSet.has(size)),
      eu: SHOE_SIZE_GROUPS.eu.filter((size) => availableShoeSizeSet.has(size)),
    }),
    [availableShoeSizeSet],
  );

  const filteredClothingSizes = useMemo(
    () => CLOTHING_SIZES.filter((size) => availableClothingSizeSet.has(size)),
    [availableClothingSizeSet],
  );

  const availableConditionSet = useMemo(
    () => new Set(availableConditions),
    [availableConditions],
  );

  const filteredConditions = useMemo(
    () => CONDITIONS.filter((cond) => availableConditionSet.has(cond)),
    [availableConditionSet, CONDITIONS],
  );

  const hasSneakers = categories.includes("sneakers");
  const hasClothing = categories.includes("clothing");
  const showShoeFilter =
    (selectedCategories.length === 0 && hasSneakers) ||
    selectedCategories.includes("sneakers");
  const showClothingFilter =
    (selectedCategories.length === 0 && hasClothing) ||
    selectedCategories.includes("clothing");
  const hasBrandableCategory =
    selectedCategories.length === 0
      ? categories.some((category) => !NON_BRAND_CATEGORIES.has(category))
      : selectedCategories.some((category) => !NON_BRAND_CATEGORIES.has(category));
  const showModelFilter = showShoeFilter && hasBrandableCategory;

  const brandLabelMap = useMemo(
    () => new Map(brands.map((brand) => [brand.value, brand.label])),
    [brands],
  );

  const availableBrandValues = useMemo(() => {
    if (!hasBrandableCategory) {
      return new Set<string>();
    }
    if (selectedCategories.length === 0) {
      return new Set(brands.map((brand) => brand.value));
    }

    const values = new Set<string>();
    selectedCategories.forEach((category) => {
      (brandsByCategory[category] ?? []).forEach((brand) => values.add(brand));
    });
    return values;
  }, [brands, brandsByCategory, selectedCategories, hasBrandableCategory]);

  const sortedModelsByBrand = useMemo(() => {
    if (!showModelFilter) {
      return {} as Record<string, string[]>;
    }
    const out: Record<string, string[]> = {};
    for (const [brandKey, models] of Object.entries(modelsByBrand)) {
      out[brandKey] = [...(models ?? [])].sort(naturalCompare);
    }
    return out;
  }, [modelsByBrand, showModelFilter, naturalCompare]);

  const filteredBrands = useMemo(
    () => brands.filter((brand) => availableBrandValues.has(brand.value)),
    [availableBrandValues, brands],
  );

  // OPTIMIZATION 3: Memoize callbacks to prevent re-renders
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleBrand = useCallback((brand: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  }, []);

  const getFilters = useCallback(() => ({
    category: selectedCategories,
    brand: selectedBrands,
    model: selectedModels,
    sizeShoe: selectedShoeSizes,
    sizeClothing: selectedClothingSizes,
    condition: selectedConditions,
  }), [selectedCategories, selectedBrands, selectedModels, selectedShoeSizes, selectedClothingSizes, selectedConditions]);

  // OPTIMIZATION 4: Wrap filter updates in startTransition for non-blocking updates
  const updateFilters = useCallback((filters: ReturnType<typeof getFilters>) => {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("category");
    params.delete("brand");
    params.delete("model");
    params.delete("sizeShoe");
    params.delete("sizeClothing");
    params.delete("condition");

    filters.category.forEach((value) => params.append("category", value));
    filters.brand.forEach((value) => params.append("brand", value));
    filters.model.forEach((value) => params.append("model", value));
    filters.sizeShoe.forEach((value) => params.append("sizeShoe", value));
    filters.sizeClothing.forEach((value) => params.append("sizeClothing", value));
    filters.condition.forEach((value) => params.append("condition", value));

    params.set("page", "1");
    
    startTransition(() => {
      router.push(`/store?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams, startTransition]);

  const handleCategoryChange = useCallback((category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    const hasBrandCategory =
      newCategories.length === 0
        ? categories.some((cat) => !NON_BRAND_CATEGORIES.has(cat))
        : newCategories.some((cat) => !NON_BRAND_CATEGORIES.has(cat));
    updateFilters({
      ...getFilters(),
      category: newCategories,
      brand: hasBrandCategory ? selectedBrands : [],
      model: hasBrandCategory ? selectedModels : [],
    });
    if (!hasBrandCategory) {
      setExpandedBrands({});
    }
  }, [selectedCategories, categories, selectedBrands, selectedModels, getFilters, updateFilters]);

  const handleBrandChange = useCallback((brand: string) => {
    const isSelected = selectedBrands.includes(brand);
    const newBrands = isSelected
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    const brandModels = modelsByBrand[brand] ?? [];
    const nextModels = isSelected
      ? selectedModels.filter((model) => !brandModels.includes(model))
      : selectedModels;
    updateFilters({ ...getFilters(), brand: newBrands, model: nextModels });
    setExpandedBrands((prev) => ({ ...prev, [brand]: !isSelected }));
  }, [selectedBrands, selectedModels, modelsByBrand, getFilters, updateFilters]);

  const handleModelChange = useCallback((model: string, brand?: string) => {
    const isSelected = selectedModels.includes(model);
    const newModels = isSelected
      ? selectedModels.filter((m) => m !== model)
      : [...selectedModels, model];
    const newBrands =
      brand && !selectedBrands.includes(brand)
        ? [...selectedBrands, brand]
        : selectedBrands;
    updateFilters({ ...getFilters(), brand: newBrands, model: newModels });
    if (brand && !isSelected) {
      setExpandedBrands((prev) => ({ ...prev, [brand]: true }));
    }
  }, [selectedModels, selectedBrands, getFilters, updateFilters]);

  const handleShoeSizeChange = useCallback((size: string) => {
    const isExplicit = selectedShoeSizes.includes(size);
    const isExpanded = expandedSelectedShoeSizeSet.has(size);

    let newSizes = selectedShoeSizes;

    if (isEuShoeSize(size)) {
      if (isExplicit) {
        newSizes = selectedShoeSizes.filter((s) => s !== size);
      } else if (isExpanded) {
        const usParents = EU_SIZE_ALIASES[size] ?? [];
        newSizes = selectedShoeSizes.filter((s) => !usParents.includes(s));
      } else {
        newSizes = [...selectedShoeSizes, size];
      }
    } else {
      newSizes = isExplicit
        ? selectedShoeSizes.filter((s) => s !== size)
        : [...selectedShoeSizes, size];
    }

    updateFilters({ ...getFilters(), sizeShoe: newSizes });
  }, [selectedShoeSizes, expandedSelectedShoeSizeSet, getFilters, updateFilters]);

  const handleClothingSizeChange = useCallback((size: string) => {
    const newSizes = selectedClothingSizes.includes(size)
      ? selectedClothingSizes.filter((s) => s !== size)
      : [...selectedClothingSizes, size];
    updateFilters({ ...getFilters(), sizeClothing: newSizes });
  }, [selectedClothingSizes, getFilters, updateFilters]);

  const handleConditionChange = useCallback((condition: string) => {
    const newConditions = selectedConditions.includes(condition)
      ? selectedConditions.filter((c) => c !== condition)
      : [...selectedConditions, condition];
    updateFilters({ ...getFilters(), condition: newConditions });
  }, [selectedConditions, getFilters, updateFilters]);

  const clearFilters = useCallback(() => {
    updateFilters({
      category: [],
      brand: [],
      model: [],
      sizeShoe: [],
      sizeClothing: [],
      condition: [],
    });
  }, [updateFilters]);

  const renderFilterContent = () => (
    // OPTIMIZATION 5: Show loading state during transitions
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Active Filters Pills */}
      {(selectedCategories.length > 0 ||
        selectedBrands.length > 0 ||
        selectedModels.length > 0 ||
        selectedShoeSizes.length > 0 ||
        selectedClothingSizes.length > 0 ||
        selectedConditions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">Active Filters</h3>
            <button
              onClick={clearFilters}
              className="text-red-500 text-xs hover:underline"
              data-testid="filters-clear-all"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {cat}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleCategoryChange(cat)}
                />
              </span>
            ))}
            {selectedBrands.map((brand, index) => (
              <span
                key={`${brand}-${index}`}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {brandLabelMap.get(brand) ?? brand}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleBrandChange(brand)}
                />
              </span>
            ))}
            {selectedModels.map((model) => (
              <span
                key={model}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {model}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleModelChange(model)}
                />
              </span>
            ))}
            {expandedSelectedShoeSizes.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {size}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleShoeSizeChange(size)}
                />
              </span>
            ))}
            {selectedClothingSizes.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {size}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleClothingSizeChange(size)}
                />
              </span>
            ))}
            {selectedConditions.map((cond) => (
              <span
                key={cond}
                className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded"
              >
                {cond}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleConditionChange(cond)}
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div>
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full text-white font-semibold mb-2"
        >
          Category
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expandedSections.category ? "rotate-180" : ""}`}
          />
        </button>
        {expandedSections.category && (
          <div className="space-y-2">
            {orderedCategories.map((cat) => (
              <label
                key={cat}
                className="flex items-center text-gray-300 hover:text-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => handleCategoryChange(cat)}
                  className="rdk-checkbox mr-2"
                  data-testid={`filter-category-${toTestId(cat)}`}
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Condition Filter */}
      {filteredConditions.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection("condition")}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Condition
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.condition ? "rotate-180" : ""}`}
            />
          </button>
          {expandedSections.condition && (
            <div className="space-y-2">
              {filteredConditions.map((cond) => (
                <label
                  key={cond}
                  className="flex items-center text-gray-300 hover:text-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(cond)}
                    onChange={() => handleConditionChange(cond)}
                    className="rdk-checkbox mr-2"
                    data-testid={`filter-condition-${toTestId(cond)}`}
                  />
                  <span className="capitalize">{cond}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand Filter */}
      {hasBrandableCategory && filteredBrands.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection("brand")}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Brand
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.brand ? "rotate-180" : ""}`}
            />
          </button>
          {expandedSections.brand && (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {filteredBrands.map((brand) => {
                const brandKey = brand.value;
                const brandModels = showModelFilter
                  ? (sortedModelsByBrand[brandKey] ?? [])
                  : [];
                const hasModels = brandModels.length > 0;
                const isExpanded =
                  Boolean(expandedBrands[brandKey]) || selectedBrands.includes(brandKey);

                return (
                  <div
                    key={brandKey}
                    className="rounded border border-zinc-800/70 bg-zinc-950/30 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brandKey)}
                          onChange={() => handleBrandChange(brandKey)}
                          className="rdk-checkbox mr-2"
                          data-testid={`filter-brand-${toTestId(brandKey)}`}
                        />
                        <span>{brand.label}</span>
                      </label>
                      {hasModels && (
                        <button
                          type="button"
                          onClick={() => toggleBrand(brandKey)}
                          className="text-zinc-500 hover:text-white transition-colors"
                          aria-label={`Toggle ${brand.label} models`}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                    {hasModels && isExpanded && (
                      <div className="mt-2 space-y-2 border-l border-zinc-800/70 pl-4">
                        {brandModels.map((model) => (
                          <label
                            key={model}
                            className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedModels.includes(model)}
                              onChange={() => handleModelChange(model, brandKey)}
                              className="rdk-checkbox mr-2"
                              data-testid={`filter-model-${toTestId(model)}`}
                            />
                            <span>{model}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Size Filter */}
      {(showShoeFilter || showClothingFilter) && (
        <div>
          <button
            onClick={() => toggleSection("size")}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Size
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.size ? "rotate-180" : ""}`}
            />
          </button>
          {expandedSections.size && (
            <div className="space-y-4">
              {showShoeFilter && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Shoe Sizes</h4>
                  <div className="space-y-4">
                    {shoeSizeGroups.youth.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Youth
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {shoeSizeGroups.youth.map((size) => (
                            <label
                              key={size}
                              className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={expandedSelectedShoeSizeSet.has(size)}
                                onChange={() => handleShoeSizeChange(size)}
                                className="rdk-checkbox mr-2"
                                data-testid={`filter-size-shoe-${toTestId(size)}`}
                              />
                              <span>{size}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {shoeSizeGroups.mens.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Men&apos;s
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {shoeSizeGroups.mens.map((size) => (
                            <label
                              key={size}
                              className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={expandedSelectedShoeSizeSet.has(size)}
                                onChange={() => handleShoeSizeChange(size)}
                                className="rdk-checkbox mr-2"
                                data-testid={`filter-size-shoe-${toTestId(size)}`}
                              />
                              <span>{size}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {shoeSizeGroups.eu.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          EU
                        </h5>
                        <div className="grid grid-cols-1 gap-2">
                          {shoeSizeGroups.eu.map((size) => (
                            <label
                              key={size}
                              className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={expandedSelectedShoeSizeSet.has(size)}
                                onChange={() => handleShoeSizeChange(size)}
                                className="rdk-checkbox mr-2"
                                data-testid={`filter-size-shoe-${toTestId(size)}`}
                              />
                              <span>{size}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {showClothingFilter && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Clothing Sizes
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredClothingSizes.map((size) => (
                      <label
                        key={size}
                        className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClothingSizes.includes(size)}
                          onChange={() => handleClothingSizeChange(size)}
                          className="rdk-checkbox mr-2"
                          data-testid={`filter-size-clothing-${toTestId(size)}`}
                        />
                        <span>{size}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* OPTIMIZATION 6: Show pending indicator */}
      {isPending && (
        <div className="text-xs text-gray-500 text-center">
          Updating filters...
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-20 right-4 h-12 w-12 bg-red-600 text-white rounded-full shadow-lg z-30 flex items-center justify-center"
        data-testid="filters-open"
      >
        <Filter className="w-5 h-5" />
      </button>

      {/* Mobile Full-Screen Modal */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {renderFilterContent()}
          </div>
        </div>
      )}

      {/* Desktop Boxed Filter Panel */}
      <div
        className="hidden md:block bg-zinc-900 border border-zinc-800/70 rounded p-6 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - var(--rdk-header-offset, 0px) - 1rem)" }}
        data-testid="filter-panel"
      >
        <h2 className="text-xl font-bold text-white mb-6">Filters</h2>
        {renderFilterContent()}
      </div>
    </>
  );
}