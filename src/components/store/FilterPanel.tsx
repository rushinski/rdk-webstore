// src/components/store/FilterPanel.tsx
'use client';

import { useMemo, useState } from 'react';
import { X, ChevronDown, Filter } from 'lucide-react';
import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";

type BrandOption = { label: string; value: string };

interface FilterPanelProps {
  selectedCategories: string[];
  selectedBrands: string[];
  selectedModels: string[];
  selectedShoeSizes: string[];
  selectedClothingSizes: string[];
  selectedConditions: string[];
  categories: string[];
  brands: BrandOption[];
  models: string[];
  onFilterChange: (filters: any) => void;
}

export function FilterPanel({
  selectedCategories,
  selectedBrands,
  selectedModels,
  selectedShoeSizes,
  selectedClothingSizes,
  selectedConditions,
  brands,
  models,
  categories,
  onFilterChange,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    model: true,
    size: true,
    condition: true,
  });

  const conditions = ['new', 'used'];

  const hasSneakers = categories.includes('sneakers');
  const hasClothing = categories.includes('clothing');
  const showShoeFilter =
    (selectedCategories.length === 0 && hasSneakers) ||
    selectedCategories.includes('sneakers');
  const showClothingFilter =
    (selectedCategories.length === 0 && hasClothing) ||
    selectedCategories.includes('clothing');
  const showModelFilter = showShoeFilter;
  const brandLabelMap = useMemo(
    () => new Map(brands.map((brand) => [brand.value, brand.label])),
    [brands]
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    onFilterChange({ ...getFilters(), category: newCategories });
  };

  const handleBrandChange = (brand: string) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    onFilterChange({ ...getFilters(), brand: newBrands });
  };

  const handleModelChange = (model: string) => {
    const newModels = selectedModels.includes(model)
      ? selectedModels.filter((m) => m !== model)
      : [...selectedModels, model];
    onFilterChange({ ...getFilters(), model: newModels });
  };

  const handleShoeSizeChange = (size: string) => {
    const newSizes = selectedShoeSizes.includes(size)
      ? selectedShoeSizes.filter(s => s !== size)
      : [...selectedShoeSizes, size];
    onFilterChange({ ...getFilters(), sizeShoe: newSizes });
  };

  const handleClothingSizeChange = (size: string) => {
    const newSizes = selectedClothingSizes.includes(size)
      ? selectedClothingSizes.filter(s => s !== size)
      : [...selectedClothingSizes, size];
    onFilterChange({ ...getFilters(), sizeClothing: newSizes });
  };

  const handleConditionChange = (condition: string) => {
    const newConditions = selectedConditions.includes(condition)
      ? selectedConditions.filter(c => c !== condition)
      : [...selectedConditions, condition];
    onFilterChange({ ...getFilters(), condition: newConditions });
  };

  const clearFilters = () => {
    onFilterChange({
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

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters Pills */}
      {(selectedCategories.length > 0 || selectedBrands.length > 0 || selectedModels.length > 0 || selectedShoeSizes.length > 0 || selectedClothingSizes.length > 0 || selectedConditions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">Active Filters</h3>
            <button onClick={clearFilters} className="text-red-500 text-xs hover:underline">
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {cat}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleCategoryChange(cat)} />
              </span>
            ))}
            {selectedBrands.map(brand => (
              <span key={brand} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {brandLabelMap.get(brand) ?? brand}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleBrandChange(brand)} />
              </span>
            ))}
            {selectedModels.map((model) => (
              <span key={model} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {model}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleModelChange(model)} />
              </span>
            ))}
            {selectedShoeSizes.map(size => (
              <span key={size} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {size}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleShoeSizeChange(size)} />
              </span>
            ))}
            {selectedClothingSizes.map(size => (
              <span key={size} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {size}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleClothingSizeChange(size)} />
              </span>
            ))}
            {selectedConditions.map(cond => (
              <span key={cond} className="inline-flex items-center gap-1 bg-red-900/30 text-white text-xs px-2 py-1 rounded">
                {cond}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleConditionChange(cond)} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div>
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-white font-semibold mb-2"
        >
          Category
          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.category ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.category && (
          <div className="space-y-2">
            {categories.map(cat => (
              <label key={cat} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => handleCategoryChange(cat)}
                  className="rdk-checkbox mr-2"
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Brand Filter */}
      {brands.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Brand
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.brand && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand.value} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.value)}
                  onChange={() => handleBrandChange(brand.value)}
                  className="rdk-checkbox mr-2"
                />
                  <span>{brand.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Filter */}
      {showModelFilter && models.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('model')}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Model
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.model ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.model && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {models.map((model) => (
                <label key={model} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelChange(model)}
                  className="rdk-checkbox mr-2"
                />
                  <span>{model}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Size Filter */}
      {(showShoeFilter || showClothingFilter) && (
        <div>
          <button
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full text-white font-semibold mb-2"
          >
            Size
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.size ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.size && (
            <div className="space-y-4">
              {showShoeFilter && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Shoe Sizes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOE_SIZES.map(size => (
                      <label key={size} className="flex items-center text-gray-300 hover:text-white cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedShoeSizes.includes(size)}
                          onChange={() => handleShoeSizeChange(size)}
                          className="rdk-checkbox mr-2"
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
                  <div className="space-y-2">
                    {CLOTHING_SIZES.map(size => (
                      <label key={size} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClothingSizes.includes(size)}
                          onChange={() => handleClothingSizeChange(size)}
                          className="rdk-checkbox mr-2"
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
          onClick={() => toggleSection('condition')}
          className="flex items-center justify-between w-full text-white font-semibold mb-2"
        >
          Condition
          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.condition ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.condition && (
          <div className="space-y-2">
            {conditions.map(cond => (
              <label key={cond} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(cond)}
                  onChange={() => handleConditionChange(cond)}
                  className="rdk-checkbox mr-2"
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
        className="md:hidden fixed bottom-20 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg z-30"
      >
        <Filter className="w-5 h-5" />
      </button>

      {/* Mobile Full-Screen Modal */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <FilterContent />
          </div>
        </div>
      )}

      {/* Desktop Boxed Filter Panel */}
      <div className="hidden md:block bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-bold text-white mb-6">Filters</h2>
        <FilterContent />
      </div>
    </>
  );
}
