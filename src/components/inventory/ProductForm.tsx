// src/components/inventory/ProductForm.tsx (Part 1 of 2)
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ImagePlus, Link as LinkIcon, Plus, Trash2, X } from 'lucide-react';
import { TagInput, type TagChip } from './TagInput';
import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { Category, Condition, SizeType } from "@/types/views/product";
import type { ProductCreateInput } from '@/services/product-service';

interface ProductFormProps {
  initialData?: Partial<ProductCreateInput> & { id?: string };
  onSubmit: (data: ProductCreateInput) => Promise<void>;
  onCancel: () => void;
}

type VariantDraft = {
  size_label: string;
  price: string;
  cost: string;
  stock: string;
};

type ImageDraft = ProductCreateInput["images"][number];

const normalizeImages = (items: ImageDraft[]) => {
  const hasPrimary = items.some((item) => item.is_primary);
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
    is_primary: hasPrimary ? item.is_primary : index === 0,
  }));
};

const formatMoney = (value: number) => value.toFixed(2);

const AUTO_TAG_GROUP_KEYS = new Set([
  'brand',
  'category',
  'condition',
  'size_shoe',
  'size_clothing',
  'size_custom',
]);

const getSizeTypeForCategory = (category: Category): SizeType => {
  if (category === 'sneakers') return 'shoe';
  if (category === 'clothing') return 'clothing';
  if (category === 'accessories') return 'custom';
  return 'none';
};

const getTagKey = (tag: { label: string; group_key: string }) =>
  `${tag.group_key}:${tag.label}`;

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'sneakers');
  const [condition, setCondition] = useState<Condition>(initialData?.condition || 'new');
  const [conditionNote, setConditionNote] = useState(initialData?.condition_note || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [shippingPrice, setShippingPrice] = useState(() => {
    if (initialData?.shipping_override_cents != null) {
      return formatMoney(initialData.shipping_override_cents / 100);
    }
    return '';
  });
  const shippingPriceTouched = useRef(initialData?.shipping_override_cents != null);
  const [shippingDefaults, setShippingDefaults] = useState<Record<string, number>>({});
  const [customTags, setCustomTags] = useState<TagChip[]>(() => {
    const tags = initialData?.tags ?? [];
    return tags
      .filter((tag) => !AUTO_TAG_GROUP_KEYS.has(tag.group_key))
      .map((tag) => ({
        label: tag.label,
        group_key: tag.group_key,
        source: 'custom',
      }));
  });
  const [excludedAutoTagKeys, setExcludedAutoTagKeys] = useState<string[]>([]);
  const hasInitializedTags = useRef(false);
  const hasInitializedVariants = useRef(false);
  
  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    const sizeType = getSizeTypeForCategory(initialData?.category || 'sneakers');
    const mapped = initialData?.variants?.map((variant) => ({
      size_label: variant.size_label,
      price: formatMoney(variant.price_cents / 100),
      cost: formatMoney((variant.cost_cents ?? 0) / 100),
      stock: String(variant.stock ?? 0),
    }));

    return (
      mapped || [
        {
          size_label: sizeType === 'none' ? 'N/A' : '',
          price: '',
          cost: '',
          stock: '1',
        },
      ]
    );
  });
  
  const [images, setImages] = useState<ImageDraft[]>(() =>
    normalizeImages(initialData?.images ?? [])
  );
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sizeType = useMemo(() => getSizeTypeForCategory(category), [category]);
  const defaultShippingPrice = shippingDefaults[category] ?? 0;

  const autoTags = useMemo<TagChip[]>(() => {
    const tags: TagChip[] = [];
    const seen = new Set<string>();

    const addTag = (label: string, group_key: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const key = `${group_key}:${trimmed}`;
      if (seen.has(key)) return;
      seen.add(key);
      tags.push({ label: trimmed, group_key, source: 'auto' });
    };

    if (brand.trim()) {
      addTag(brand, 'brand');
    }

    if (category) {
      addTag(category, 'category');
    }

    if (condition) {
      addTag(condition, 'condition');
    }

    if (sizeType !== 'none') {
      const groupKey =
        sizeType === 'shoe'
          ? 'size_shoe'
          : sizeType === 'clothing'
          ? 'size_clothing'
          : 'size_custom';

      variants.forEach((variant) => {
        const stockCount = Number.parseInt(variant.stock, 10);
        if (!Number.isFinite(stockCount) || stockCount <= 0) return;
        addTag(variant.size_label, groupKey);
      });
    }

    return tags;
  }, [brand, category, condition, sizeType, variants]);

  const visibleAutoTags = useMemo(
    () => autoTags.filter((tag) => !excludedAutoTagKeys.includes(getTagKey(tag))),
    [autoTags, excludedAutoTagKeys]
  );

  const allTags = useMemo(() => {
    const merged = [...visibleAutoTags, ...customTags];
    const seen = new Set<string>();
    return merged.filter((tag) => {
      const key = getTagKey(tag);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [visibleAutoTags, customTags]);

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const response = await fetch('/api/admin/shipping/defaults');
        const data = await response.json();
        if (response.ok && data?.defaults) {
          const map: Record<string, number> = {};
          for (const entry of data.defaults) {
            map[entry.category] = Number(entry.default_price ?? 0);
          }
          setShippingDefaults(map);
        }
      } catch (error) {
        console.error('Load shipping defaults error:', error);
      }
    };

    loadDefaults();
  }, []);

  useEffect(() => {
    if (shippingPriceTouched.current) return;
    const defaultPrice = shippingDefaults[category];
    if (typeof defaultPrice === 'number') {
      setShippingPrice(formatMoney(defaultPrice));
    }
  }, [category, shippingDefaults]);

  useEffect(() => {
    if (!hasInitializedVariants.current) {
      hasInitializedVariants.current = true;
      return;
    }

    setVariants((current) =>
      current.map((variant) => {
        if (sizeType === 'none') {
          return { ...variant, size_label: 'N/A' };
        }
        if (sizeType === 'custom') {
          return variant.size_label === 'N/A' ? { ...variant, size_label: '' } : variant;
        }
        return { ...variant, size_label: '' };
      })
    );
  }, [sizeType]);

  useEffect(() => {
    if (hasInitializedTags.current || !initialData?.tags) return;

    const existingKeys = new Set(initialData.tags.map(getTagKey));
    const missing = autoTags
      .map(getTagKey)
      .filter((key) => !existingKeys.has(key));

    setExcludedAutoTagKeys(missing);
    hasInitializedTags.current = true;
  }, [autoTags, initialData?.tags]);

  const addVariant = () => {
    setVariants([...variants, {
      size_label: sizeType === 'none' ? 'N/A' : '',
      price: '',
      cost: '',
      stock: '1'
    }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const addImageEntry = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setImages((current) =>
      normalizeImages([
        ...current,
        {
          url: trimmed,
          sort_order: current.length,
          is_primary: current.length === 0,
        },
      ])
    );
  };

  const removeImage = (index: number) => {
    setImages((current) => normalizeImages(current.filter((_, i) => i !== index)));
  };

  const setPrimaryImage = (index: number) => {
    setImages((current) =>
      normalizeImages(
        current.map((image, i) => ({
          ...image,
          is_primary: i === index,
        }))
      )
    );
  };

  const handleAddImageUrl = () => {
    addImageEntry(imageUrlInput);
    setImageUrlInput('');
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploads = Array.from(files);
    const reads = uploads.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    );

    try {
      const results = await Promise.all(reads);
      results.forEach((url) => addImageEntry(url));
    } catch (error) {
      console.error("Image upload error:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddTag = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    const newTag: TagChip = {
      label: trimmed,
      group_key: 'custom',
      source: 'custom',
    };

    const existingKeys = new Set(allTags.map(getTagKey));
    if (existingKeys.has(getTagKey(newTag))) return;

    setCustomTags([...customTags, newTag]);
  };

  const handleRemoveTag = (tag: TagChip) => {
    if (tag.source === 'auto') {
      const key = getTagKey(tag);
      setExcludedAutoTagKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      return;
    }

    setCustomTags(customTags.filter((item) => getTagKey(item) !== getTagKey(tag)));
  };

  const parseMoneyToCents = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100);
  };

  const parseStockCount = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(parsed, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const shippingCents = parseMoneyToCents(shippingPrice);
      if (shippingCents === null) {
        throw new Error("Please enter a valid shipping price.");
      }

      const preparedVariants = variants.map((variant, index) => {
        const priceCents = parseMoneyToCents(variant.price);
        if (priceCents === null) {
          throw new Error(`Variant ${index + 1} price is invalid.`);
        }
        const costCents = parseMoneyToCents(variant.cost) ?? 0;
        const stockCount = parseStockCount(variant.stock);
        if (stockCount === null) {
          throw new Error(`Variant ${index + 1} stock is invalid.`);
        }
        const sizeLabel =
          sizeType === 'none' ? 'N/A' : variant.size_label.trim();
        if (sizeType !== 'none' && !sizeLabel) {
          throw new Error(`Variant ${index + 1} size is required.`);
        }

        return {
          size_type: sizeType,
          size_label: sizeLabel,
          price_cents: priceCents,
          cost_cents: costCents,
          stock: stockCount,
        };
      });

      const preparedImages = normalizeImages(images)
        .map((image) => ({ ...image, url: image.url.trim() }))
        .filter((image) => image.url);

      if (preparedImages.length === 0) {
        throw new Error("Please add at least one product image.");
      }

      const data: ProductCreateInput = {
        brand,
        name,
        category,
        condition,
        condition_note: conditionNote || undefined,
        description: description || undefined,
        shipping_override_cents: shippingCents,
        variants: preparedVariants,
        images: preparedImages,
        tags: allTags.map((tag) => ({
          label: tag.label,
          group_key: tag.group_key,
        })),
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Form submit error:', error);
      const message = error instanceof Error ? error.message : 'Failed to save product';
      alert(message);
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
                  <label className="block text-gray-400 text-xs mb-1">Size</label>
                  {sizeType === 'shoe' && (
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
                  )}
                  {sizeType === 'clothing' && (
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
                  )}
                  {sizeType === 'custom' && (
                    <input
                      type="text"
                      value={variant.size_label}
                      onChange={(e) => updateVariant(index, 'size_label', e.target.value)}
                      required
                      placeholder="e.g., One Size"
                      className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                    />
                  )}
                  {sizeType === 'none' && (
                    <input
                      type="text"
                      value="N/A"
                      disabled
                      className="w-full bg-zinc-900 text-gray-500 px-3 py-2 rounded text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Price ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Cost ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.cost}
                    onChange={(e) => updateVariant(index, 'cost', e.target.value)}
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">Stock</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                    required
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">Images</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition"
            >
              <ImagePlus className="w-4 h-4" />
              Upload Image
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUploadFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-gray-400 text-xs mb-1">Add Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
                placeholder="https://..."
                className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded text-sm transition"
              >
                <LinkIcon className="w-4 h-4" />
                Add URL
              </button>
            </div>
          </div>
        </div>

        {images.length === 0 ? (
          <div className="text-gray-500 text-sm">No images added yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group bg-zinc-800 rounded overflow-hidden">
                <div className="aspect-square bg-zinc-900 overflow-hidden">
                  {image.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      Missing image
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPrimaryImage(index)}
                  className={`absolute bottom-2 left-2 px-2 py-1 text-xs rounded ${
                    image.is_primary
                      ? 'bg-green-600 text-white'
                      : 'bg-black/60 text-gray-200 hover:bg-black/80'
                  }`}
                >
                  {image.is_primary ? 'Primary' : 'Set Primary'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing & Shipping */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Pricing & Shipping</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Shipping Price ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={shippingPrice}
              onChange={(e) => {
                shippingPriceTouched.current = true;
                setShippingPrice(e.target.value);
              }}
              placeholder={`Default $${formatMoney(defaultShippingPrice)}`}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              Default for {category} is ${formatMoney(defaultShippingPrice)}.
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
        <TagInput tags={allTags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />
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
