// src/components/inventory/ProductForm.tsx (Part 1 of 2)
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { TagInput } from './TagInput';
import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { Category, Condition, SizeType } from "@/types/views/product";
import type { ProductCreateInput } from '@/services/product-service';

interface ProductFormProps {
  initialData?: Partial<ProductCreateInput> & { id?: string };
  onSubmit: (data: ProductCreateInput) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'sneakers');
  const [condition, setCondition] = useState<Condition>(initialData?.condition || 'new');
  const [conditionNote, setConditionNote] = useState(initialData?.condition_note || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [costCents, setCostCents] = useState(initialData?.cost_cents || 0);
  const [shippingOverrideCents, setShippingOverrideCents] = useState(initialData?.shipping_override_cents || 0);
  const [customTags, setCustomTags] = useState<string[]>(initialData?.custom_tags || []);
  
  const [variants, setVariants] = useState(
    initialData?.variants || [
      { size_type: 'shoe' as SizeType, size_label: '', price_cents: 0, stock: 1 }
    ]
  );
  
  const [images, setImages] = useState(
    initialData?.images || [
      { url: '', sort_order: 0, is_primary: true }
    ]
  );

  // Auto-detect category based on size selection
  useEffect(() => {
    const hasShoeSize = variants.some(v => v.size_type === 'shoe');
    const hasClothingSize = variants.some(v => v.size_type === 'clothing');
    
    if (hasShoeSize && !hasClothingSize) {
      setCategory('sneakers');
    } else if (hasClothingSize && !hasShoeSize) {
      setCategory('clothing');
    }
  }, [variants]);

  const addVariant = () => {
    setVariants([...variants, {
      size_type: 'shoe',
      size_label: '',
      price_cents: 0,
      stock: 1
    }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof typeof variants[0], value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const addImage = () => {
    setImages([...images, {
      url: '',
      sort_order: images.length,
      is_primary: false
    }]);
  };

  const removeImage = (index: number) => {
    if (images.length > 1) {
      setImages(images.filter((_, i) => i !== index));
    }
  };

  const updateImage = (index: number, field: keyof typeof images[0], value: any) => {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    setImages(updated);
  };

  const setPrimaryImage = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data: ProductCreateInput = {
        brand,
        name,
        category,
        condition,
        condition_note: conditionNote || undefined,
        description: description || undefined,
        cost_cents: costCents,
        shipping_override_cents: shippingOverrideCents || undefined,
        variants,
        images,
        custom_tags: customTags,
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Form submit error:', error);
      alert('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Brand *</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              required
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="sneakers">Sneakers</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="electronics">Electronics</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Condition *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              required
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>

        {condition === 'used' && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-1">Condition Note</label>
            <textarea
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="block text-gray-400 text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>

      {/* Variants */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="bg-zinc-800 p-4 rounded flex gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Size Type</label>
                  <select
                    value={variant.size_type}
                    onChange={(e) => updateVariant(index, 'size_type', e.target.value)}
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                  >
                    <option value="shoe">Shoe</option>
                    <option value="clothing">Clothing</option>
                    <option value="custom">Custom</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Size Label</label>
                  {variant.size_type === 'shoe' ? (
                    <select
                      value={variant.size_label}
                      onChange={(e) => updateVariant(index, 'size_label', e.target.value)}
                      required
                      className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      {SHOE_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  ) : variant.size_type === 'clothing' ? (
                    <select
                      value={variant.size_label}
                      onChange={(e) => updateVariant(index, 'size_label', e.target.value)}
                      required
                      className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      {CLOTHING_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={variant.size_label}
                      onChange={(e) => updateVariant(index, 'size_label', e.target.value)}
                      required
                      placeholder={variant.size_type === 'custom' ? 'e.g., One Size' : 'N/A'}
                      className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={variant.price_cents / 100}
                    onChange={(e) => updateVariant(index, 'price_cents', Math.round(parseFloat(e.target.value) * 100))}
                    required
                    step="0.01"
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Stock</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value))}
                    required
                    min="0"
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                  />
                </div>
              </div>

              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Images</h2>
          <button
            type="button"
            onClick={addImage}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Image
          </button>
        </div>

        <div className="space-y-4">
          {images.map((image, index) => (
            <div key={index} className="bg-zinc-800 p-4 rounded flex gap-4">
              <div className="flex-1">
                <input
                  type="url"
                  value={image.url}
                  onChange={(e) => updateImage(index, 'url', e.target.value)}
                  placeholder="Image URL"
                  required
                  className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                />
                <p className="text-gray-500 text-xs mt-1">
                  TODO: Image upload (for now, use placeholder URLs)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrimaryImage(index)}
                className={`px-3 py-2 rounded text-sm ${
                  image.is_primary
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-700 text-gray-400 hover:bg-zinc-600'
                }`}
              >
                {image.is_primary ? 'Primary' : 'Set Primary'}
              </button>

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pricing & Shipping */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Pricing & Shipping</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Cost Basis ($)</label>
            <input
              type="number"
              value={costCents / 100}
              onChange={(e) => setCostCents(Math.round(parseFloat(e.target.value) * 100))}
              step="0.01"
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <p className="text-gray-500 text-xs mt-1">What you paid for this item</p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Shipping Override ($)</label>
            <input
              type="number"
              value={shippingOverrideCents / 100}
              onChange={(e) => setShippingOverrideCents(Math.round(parseFloat(e.target.value) * 100))}
              step="0.01"
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <p className="text-gray-500 text-xs mt-1">Leave 0 for default shipping</p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Custom Tags</h2>
        <TagInput tags={customTags} onTagsChange={setCustomTags} />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded transition"
        >
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}