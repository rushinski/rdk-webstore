// app/store/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterPanel } from '@/components/store/FilterPanel';
import { ProductGrid } from '@/components/store/ProductGrid';
import type { ProductWithDetails } from "@/types/views/product";

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [brands, setBrands] = useState<Array<{ label: string; value: string }>>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, string[]>>({});
  const [brandsByCategory, setBrandsByCategory] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('newest');

  const selectedCategories = searchParams.getAll('category');
  const selectedBrands = searchParams.getAll('brand');
  const selectedModels = searchParams.getAll('model');
  const selectedShoeSizes = searchParams.getAll('sizeShoe');
  const selectedClothingSizes = searchParams.getAll('sizeClothing');
  const selectedConditions = searchParams.getAll('condition');
  const query = searchParams.get('q') || '';

  useEffect(() => {
    loadProducts();
    loadFilters();
  }, [searchParams]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', sort);
      
      const response = await fetch(`/api/store/products?${params}`);
      const data = await response.json();
      
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await fetch("/api/store/filters");
      const data = await response.json();
      const brandOptions = Array.isArray(data.brands)
        ? data.brands.map((b: any) => ({
            value: b.label,
            label: b?.isVerified ? b.label : `${b.label} (Unverified)`,
          }))
        : [];

      setBrands(brandOptions);
      setModelsByBrand(data.modelsByBrand ?? {});
      setBrandsByCategory(data.brandsByCategory ?? {});
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (error) {
      console.error("Load filters error:", error);
    }
  };

  const handleFilterChange = (filters: any) => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (filters.category.length > 0) {
      filters.category.forEach((c: string) => params.append('category', c));
    }
    if (filters.brand.length > 0) {
      filters.brand.forEach((b: string) => params.append('brand', b));
    }
    if (filters.model.length > 0) {
      filters.model.forEach((m: string) => params.append('model', m));
    }
    if (filters.sizeShoe.length > 0) {
      filters.sizeShoe.forEach((s: string) => params.append('sizeShoe', s));
    }
    if (filters.sizeClothing.length > 0) {
      filters.sizeClothing.forEach((s: string) => params.append('sizeClothing', s));
    }
    if (filters.condition.length > 0) {
      filters.condition.forEach((c: string) => params.append('condition', c));
    }

    router.push(`/store?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          {query ? `Search: "${query}"` : 'Shop All'}
        </h1>
        <p className="text-gray-400">{total} products</p>
      </div>

      {/* Sort */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-gray-400 text-sm">
          Showing {products.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Sort by:</label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              loadProducts();
            }}
            className="bg-zinc-900 text-white px-3 py-2 rounded border border-zinc-800/70 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters (Desktop) */}
        <div className="hidden lg:block">
          <FilterPanel
            selectedCategories={selectedCategories}
            selectedBrands={selectedBrands}
            selectedModels={selectedModels}
            selectedShoeSizes={selectedShoeSizes}
            selectedClothingSizes={selectedClothingSizes}
            selectedConditions={selectedConditions}
            categories={categories}
            brands={brands}
            modelsByBrand={modelsByBrand}
            brandsByCategory={brandsByCategory}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <div className="lg:hidden">
        <FilterPanel
          selectedCategories={selectedCategories}
          selectedBrands={selectedBrands}
          selectedModels={selectedModels}
          selectedShoeSizes={selectedShoeSizes}
          selectedClothingSizes={selectedClothingSizes}
          selectedConditions={selectedConditions}
          categories={categories}
          brands={brands}
          modelsByBrand={modelsByBrand}
          brandsByCategory={brandsByCategory}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
}
