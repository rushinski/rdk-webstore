// src/components/store/FilterPanel.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, Filter } from "lucide-react";

import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";

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
}: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    size: true,
    condition: true,
  });
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const orderedCategories = useMemo(() => {
    const priority = ["sneakers", "clothing", "accessories", "electronics"];
    const ordered = priority.filter((cat) => categories.includes(cat));
    const remaining = categories
      .filter((cat) => !priority.includes(cat))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }, [categories]);

  const conditions = ["new", "used"];
  const toTestId = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

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

  const filteredBrands = useMemo(
    () => brands.filter((brand) => availableBrandValues.has(brand.value)),
    [availableBrandValues, brands],
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const handleCategoryChange = (category: string) => {
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
  };

  const handleBrandChange = (brand: string) => {
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
  };

  const handleModelChange = (model: string, brand?: string) => {
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
  };

  const handleShoeSizeChange = (size: string) => {
    const newSizes = selectedShoeSizes.includes(size)
      ? selectedShoeSizes.filter((s) => s !== size)
      : [...selectedShoeSizes, size];
    updateFilters({ ...getFilters(), sizeShoe: newSizes });
  };

  const handleClothingSizeChange = (size: string) => {
    const newSizes = selectedClothingSizes.includes(size)
      ? selectedClothingSizes.filter((s) => s !== size)
      : [...selectedClothingSizes, size];
    updateFilters({ ...getFilters(), sizeClothing: newSizes });
  };

  const handleConditionChange = (condition: string) => {
    const newConditions = selectedConditions.includes(condition)
      ? selectedConditions.filter((c) => c !== condition)
      : [...selectedConditions, condition];
    updateFilters({ ...getFilters(), condition: newConditions });
  };

  const clearFilters = () => {
    updateFilters({
      category: [],
      brand: [],
      model: [],
      sizeShoe: [],
      sizeClothing: [],
      condition: [],
    });
  };

  const getFilters = () => ({
    category: selectedCategories,
    brand: selectedBrands,
    model: selectedModels,
    sizeShoe: selectedShoeSizes,
    sizeClothing: selectedClothingSizes,
    condition: selectedConditions,
  });

  const updateFilters = (filters: ReturnType<typeof getFilters>) => {
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
    router.push(`/store?${params.toString()}`, { scroll: false });
  };

  const renderFilterContent = () => (
    <div className="space-y-6">
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
            {selectedShoeSizes.map((size) => (
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
                  ? (modelsByBrand[brandKey] ?? [])
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
                  <h4 className="text-sm text-gray-400 mb-2">Shoe Sizes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOE_SIZES.map((size) => (
                      <label
                        key={size}
                        className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedShoeSizes.includes(size)}
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
              {showClothingFilter && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Clothing Sizes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CLOTHING_SIZES.map((size) => (
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

      {/* Condition Filter */}
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
            {conditions.map((cond) => (
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
