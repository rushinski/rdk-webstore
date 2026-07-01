// src/components/inventory/ProductForm.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { Category, Condition, SizeType } from "@/types/domain/product";
import type { ProductCreateInput } from "@/services/product-service";
import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";

import type { TagChip } from "./TagInput";
import { ProductFormDetailsSection } from "./product-form/ProductFormDetailsSection";
import { buildProductCreateInput } from "./product-form/buildProductCreateInput";
import { executeProductImageUpload } from "./product-form/executeProductImageUpload";
import { ProductFormMediaSection } from "./product-form/ProductFormMediaSection";
import { ProductFormVariantsSection } from "./product-form/ProductFormVariantsSection";
import { summarizeProductImageUploadOutcome } from "./product-form/summarizeProductImageUploadOutcome";
import { validateProductImageFiles } from "./product-form/validateProductImageFiles";
import type { CatalogOption, ImageDraft, VariantDraft } from "./product-form/types";

// OPTIMIZATION: Lazy load image compression library
const loadImageCompression = () => import("browser-image-compression");

interface ProductFormProps {
  initialData?: Partial<ProductCreateInput> & { id?: string };
  onSubmit: (data: ProductCreateInput) => Promise<void>;
  onCancel: () => void;

  // NEW: Server-side data props
  initialShippingDefaults?: Array<{
    category: string;
    shipping_cost_cents?: number;
    default_price_cents?: number;
    default_price?: number;
  }>;
  initialBrands?: Array<{
    id: string;
    label: string;
    groupKey?: string | null;
  }>;
}

type BrandCatalogEntry = {
  id: string;
  canonical_label: string;
  group?: { key?: string | null } | null;
};

type ModelCatalogEntry = {
  id: string;
  canonical_label: string;
};

type TitleParseResult = {
  titleRaw: string;
  titleDisplay: string;
  brand: {
    id: string | null;
    label: string;
    groupKey?: string | null;
    isVerified: boolean;
  };
  model: {
    id: string | null;
    label: string | null;
    isVerified: boolean;
  };
  name: string;
  suggestions?: {
    brand?: { id: string; label: string; confidence: number };
    model?: { id: string; label: string; confidence: number };
  };
};

const normalizeImages = (items: ImageDraft[]) => {
  const hasPrimary = items.some((item) => item.is_primary);
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
    is_primary: hasPrimary ? item.is_primary : index === 0,
  }));
};

const formatMoney = (value: number) => value.toFixed(2);

const toDateTimeLocalValue = (value?: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const AUTO_TAG_GROUP_KEYS = new Set([
  "brand",
  "model",
  "category",
  "condition",
  "designer_brand",
  "size_shoe",
  "size_clothing",
  "size_custom",
]);

const getSizeTypeForCategory = (category: Category): SizeType => {
  if (category === "sneakers") {
    return "shoe";
  }
  if (category === "clothing") {
    return "clothing";
  }
  if (category === "accessories") {
    return "custom";
  }
  return "none";
};

const getTagKey = (tag: { label: string; group_key: string }) =>
  `${tag.group_key}:${tag.label}`;

const createVariantDraftId = () =>
  `variant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDraftSku = () =>
  `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  initialShippingDefaults, // NEW
  initialBrands, // NEW
}: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const initialTitle = initialData?.name ?? "";
  const [titleRaw, setTitleRaw] = useState(initialTitle);

  const [parseResult, setParseResult] = useState<TitleParseResult | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "loading" | "error">("idle");

  const [brandOverrideId, setBrandOverrideId] = useState<string | null>(null);
  const [brandOverrideInput, setBrandOverrideInput] = useState("");
  const [modelOverrideId, setModelOverrideId] = useState<string | null>(null);
  const [modelOverrideInput, setModelOverrideInput] = useState("");

  // UPDATED: Use server data if provided
  const [brandOptions, setBrandOptions] = useState<CatalogOption[]>(initialBrands || []);
  const [modelOptions, setModelOptions] = useState<CatalogOption[]>([]);

  const [category, setCategory] = useState<Category>(initialData?.category || "sneakers");
  const [condition, setCondition] = useState<Condition>(initialData?.condition || "new");
  const [description, setDescription] = useState(initialData?.description || "");
  const [publishMode, setPublishMode] = useState<"immediately" | "scheduled">(() => {
    const goLiveAt = initialData?.go_live_at;
    if (!goLiveAt) {
      return "immediately";
    }
    const parsed = Date.parse(goLiveAt);
    if (!Number.isFinite(parsed)) {
      return "immediately";
    }
    return parsed > Date.now() ? "scheduled" : "immediately";
  });
  const [scheduledGoLiveAt, setScheduledGoLiveAt] = useState(() =>
    toDateTimeLocalValue(initialData?.go_live_at),
  );

  const [shippingPrice, setShippingPrice] = useState(() => {
    const shippingPriceCents = initialData?.shipping_price_cents;
    if (shippingPriceCents !== null && shippingPriceCents !== undefined) {
      return formatMoney(shippingPriceCents / 100);
    }
    return "";
  });

  const [uploadQueue, setUploadQueue] = useState<{
    total: number;
    completed: number;
    failed: number;
    isUploading: boolean;
    currentStatus?: string;
  }>({
    total: 0,
    completed: 0,
    failed: 0,
    isUploading: false,
  });

  // UPDATED: Use server data to initialize shipping defaults
  const [shippingDefaults, setShippingDefaults] = useState<Record<string, number>>(() => {
    if (!initialShippingDefaults) {
      return {};
    }

    const map: Record<string, number> = {};
    for (const entry of initialShippingDefaults) {
      const cents =
        Number(
          entry.shipping_cost_cents ??
            entry.default_price_cents ??
            entry.default_price ??
            0,
        ) || 0;
      map[entry.category] = cents / 100;
    }
    return map;
  });

  // UPDATED: Start as ready if server data provided
  const [shippingDefaultsStatus, setShippingDefaultsStatus] = useState<
    "loading" | "ready" | "error"
  >(initialShippingDefaults ? "ready" : "loading");

  const [customTags, setCustomTags] = useState<TagChip[]>(() => {
    const tags = initialData?.tags ?? [];
    return tags
      .filter((tag) => !AUTO_TAG_GROUP_KEYS.has(tag.group_key))
      .map((tag) => ({
        label: tag.label,
        group_key: tag.group_key,
        source: "custom",
      }));
  });

  const [excludedAutoTagKeys, setExcludedAutoTagKeys] = useState<string[]>(
    () => initialData?.excluded_auto_tag_keys ?? [],
  );
  const previousSizeType = useRef<SizeType | null>(null);

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    const sizeType = getSizeTypeForCategory(initialData?.category || "sneakers");
    const sortedInitialVariants = [...(initialData?.variants ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const mapped = sortedInitialVariants.map((variant) => ({
      draft_id: createVariantDraftId(),
      id: variant.id ?? undefined,
      sku: variant.sku?.trim() || createDraftSku(),
      size_label: variant.size_label?.trim() ?? "",
      salePrice: formatMoney(variant.sale_price_cents / 100),
      unitCost: formatMoney((variant.unit_cost_cents ?? 0) / 100),
      stock: String(variant.stock ?? 0),
    }));

    return mapped.length > 0
      ? mapped
      : [
          {
            draft_id: createVariantDraftId(),
            sku: createDraftSku(),
            size_label: sizeType === "none" ? "N/A" : "",
            salePrice: "",
            unitCost: "",
            stock: "1",
          },
        ];
  });

  const [images, setImages] = useState<ImageDraft[]>(() =>
    normalizeImages(initialData?.images ?? []),
  );

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const sizeType = useMemo(() => getSizeTypeForCategory(category), [category]);
  const variantIds = useMemo(
    () => variants.map((variant) => variant.draft_id),
    [variants],
  );
  const defaultShippingPrice = shippingDefaults[category] ?? 0;
  const scheduleMin = useMemo(() => toDateTimeLocalValue(new Date().toISOString()), []);
  const variantDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ensureScheduledTime = useCallback(() => {
    if (scheduledGoLiveAt.trim()) {
      return;
    }
    const defaultTime = toDateTimeLocalValue(new Date().toISOString());
    setScheduledGoLiveAt(defaultTime);
  }, [scheduledGoLiveAt]);

  const parsedBrandLabel = parseResult?.brand?.label?.trim() ?? "";
  const parsedBrandGroup = parseResult?.brand?.groupKey ?? null;
  const parsedModelLabel = parseResult?.model?.label?.trim() ?? "";

  const autoTags = useMemo<TagChip[]>(() => {
    const tags: TagChip[] = [];
    const seen = new Set<string>();

    const addTag = (label: string, group_key: string) => {
      const trimmed = label.trim();
      if (!trimmed) {
        return;
      }
      const key = `${group_key}:${trimmed}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      tags.push({ label: trimmed, group_key, source: "auto" });
    };

    if (parsedBrandLabel) {
      addTag(parsedBrandLabel, "brand");
      if (parsedBrandGroup === "designer") {
        addTag(parsedBrandLabel, "designer_brand");
      }
    }

    if (parsedModelLabel && category === "sneakers") {
      addTag(parsedModelLabel, "model");
    }

    if (category) {
      addTag(category, "category");
    }
    if (condition) {
      addTag(condition, "condition");
    }

    if (sizeType !== "none") {
      const groupKey =
        sizeType === "shoe"
          ? "size_shoe"
          : sizeType === "clothing"
            ? "size_clothing"
            : "size_custom";

      variants.forEach((variant) => {
        const stockCount = Number.parseInt(variant.stock, 10);
        if (!Number.isFinite(stockCount) || stockCount <= 0) {
          return;
        }
        addTag(variant.size_label, groupKey);
      });
    }

    return tags;
  }, [
    parsedBrandLabel,
    parsedBrandGroup,
    parsedModelLabel,
    category,
    condition,
    sizeType,
    variants,
  ]);

  const visibleAutoTags = useMemo(
    () => autoTags.filter((tag) => !excludedAutoTagKeys.includes(getTagKey(tag))),
    [autoTags, excludedAutoTagKeys],
  );

  const allTags = useMemo(() => {
    const merged = [...visibleAutoTags, ...customTags];
    const seen = new Set<string>();
    return merged.filter((tag) => {
      const key = getTagKey(tag);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [visibleAutoTags, customTags]);

  // OPTIMIZATION: Memoize shipping defaults loader
  const loadShippingDefaults = useCallback(async () => {
    setShippingDefaultsStatus("loading");
    try {
      const response = await fetch("/api/admin/shipping/defaults");
      const data = await response.json();

      if (response.ok && data?.defaults) {
        const map: Record<string, number> = {};
        for (const entry of data.defaults) {
          const cents =
            Number(
              entry.shipping_cost_cents ??
                entry.default_price_cents ??
                entry.default_price ??
                0,
            ) || 0;
          map[entry.category] = cents / 100;
        }
        setShippingDefaults(map);
        setShippingDefaultsStatus("ready");
        return;
      }

      setShippingDefaultsStatus("error");
    } catch (error) {
      logError(error, { layer: "frontend", event: "inventory_load_shipping_defaults" });
      setShippingDefaultsStatus("error");
    }
  }, []);

  // UPDATED: Skip loading if data already provided from server
  useEffect(() => {
    if (initialShippingDefaults) {
      // Data already loaded from server
      return;
    }
    loadShippingDefaults();
  }, [initialShippingDefaults, loadShippingDefaults]);

  // OPTIMIZATION: Memoize brand catalog loader
  const loadBrands = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/catalog/brands");
      const data = await response.json();
      if (response.ok) {
        const options = (data.brands || []).map((brand: BrandCatalogEntry) => ({
          id: brand.id,
          label: brand.canonical_label,
          groupKey: brand.group?.key ?? null,
        }));
        setBrandOptions(options);
      }
    } catch (error) {
      logError(error, { layer: "frontend", event: "inventory_load_brand_catalog" });
    }
  }, []);

  // UPDATED: Skip loading if data already provided from server
  useEffect(() => {
    if (initialBrands) {
      // Data already loaded from server
      return;
    }
    loadBrands();
  }, [initialBrands, loadBrands]);

  const effectiveBrandId = brandOverrideId ?? parseResult?.brand?.id ?? null;

  useEffect(() => {
    if (!effectiveBrandId) {
      setModelOptions([]);
      return;
    }

    const loadModels = async () => {
      try {
        const response = await fetch(
          `/api/admin/catalog/models?brandId=${effectiveBrandId}`,
        );
        const data = await response.json();
        if (response.ok) {
          const options = (data.models || []).map((model: ModelCatalogEntry) => ({
            id: model.id,
            label: model.canonical_label,
          }));
          setModelOptions(options);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "inventory_load_model_catalog" });
      }
    };

    loadModels();
  }, [effectiveBrandId]);

  useEffect(() => {
    if (!modelOverrideId) {
      return;
    }
    const stillValid = modelOptions.some((option) => option.id === modelOverrideId);
    if (!stillValid) {
      setModelOverrideId(null);
      setModelOverrideInput("");
    }
  }, [modelOptions, modelOverrideId]);

  useEffect(() => {
    if (!titleRaw.trim()) {
      setParseResult(null);
      setParseStatus("idle");
      return;
    }

    const controller = new AbortController();
    const parseTitle = async () => {
      setParseStatus("loading");
      try {
        const response = await fetch("/api/admin/catalog/parse-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleRaw,
            category,
            brandOverrideId,
            modelOverrideId,
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to parse title.");
        }
        setParseResult(data);
        setParseStatus("idle");
      } catch (error: unknown) {
        const isAbort =
          error instanceof DOMException
            ? error.name === "AbortError"
            : typeof error === "object" &&
              error !== null &&
              "name" in error &&
              (error as { name?: string }).name === "AbortError";
        if (isAbort) {
          return;
        }
        logError(error, { layer: "frontend", event: "inventory_parse_title" });
        setParseStatus("error");
      }
    };
    const timeout = setTimeout(() => {
      void parseTitle();
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [titleRaw, category, brandOverrideId, modelOverrideId]);

  useEffect(() => {
    if (previousSizeType.current === null) {
      previousSizeType.current = sizeType;
      return;
    }

    if (previousSizeType.current === sizeType) {
      return;
    }

    previousSizeType.current = sizeType;

    setVariants((current) =>
      current.map((variant) => {
        if (sizeType === "none") {
          return { ...variant, size_label: "N/A" };
        }
        if (sizeType === "custom") {
          return variant.size_label === "N/A" ? { ...variant, size_label: "" } : variant;
        }
        return { ...variant, size_label: "" };
      }),
    );
  }, [sizeType]);

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        draft_id: createVariantDraftId(),
        sku: createDraftSku(),
        size_label: sizeType === "none" ? "N/A" : "",
        salePrice: "",
        unitCost: "",
        stock: "1",
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: string) => {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const handleVariantDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setVariants((current) => {
      const oldIndex = current.findIndex(
        (variant) => variant.draft_id === String(active.id),
      );
      const newIndex = current.findIndex(
        (variant) => variant.draft_id === String(over.id),
      );

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const buildSizeOptions = (
    sizes: readonly string[],
    selectedValue: string,
  ): { value: string; label: string }[] => {
    const trimmedValue = selectedValue.trim();
    const base = sizes.map((size) => ({ value: size, label: size }));
    const hasValue = trimmedValue.length > 0;
    const inList = hasValue && sizes.includes(trimmedValue);
    const withSelected =
      !hasValue || inList
        ? base
        : [{ value: trimmedValue, label: trimmedValue }, ...base];
    return [{ value: "", label: "Select..." }, ...withSelected];
  };

  const addImageEntry = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    setImages((current) =>
      normalizeImages([
        ...current,
        {
          url: trimmed,
          sort_order: current.length,
          is_primary: current.length === 0,
        },
      ]),
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
        })),
      ),
    );
  };

  // OPTIMIZATION: Lazy load compression and memoize function
  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (file.size < 1 * 1024 * 1024) {
      console.info(
        "[compressImage] File already small, skipping compression:",
        file.size,
      );
      return file;
    }

    console.info("[compressImage] Compressing file:", {
      name: file.name,
      originalSize: file.size,
      originalType: file.type,
    });

    try {
      const imageCompression = await loadImageCompression();
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type || "image/jpeg",
      };

      const compressedFile = await imageCompression.default(file, options);

      console.info("[compressImage] Compression successful:", {
        originalSize: file.size,
        compressedSize: compressedFile.size,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
      });

      return compressedFile;
    } catch (error) {
      console.error("[compressImage] Compression failed, using original:", error);
      logError(error, {
        layer: "frontend",
        event: "image_compression_failed",
        fileName: file.name,
        fileSize: file.size,
      });
      return file;
    }
  }, []);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    console.info("[ProductForm] Received", files.length, "file(s) for upload");
    console.info("[ProductForm] User agent:", navigator.userAgent);

    const fileArray = Array.from(files);
    console.info("[ProductForm] Converted to array, length:", fileArray.length);
    const { valid, errors } = validateProductImageFiles(fileArray);

    if (errors.length > 0) {
      console.error("[ProductForm] Validation errors:", errors);
      setToast({
        message: errors.join("; "),
        tone: "error",
      });

      if (valid.length === 0) {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setIsDragging(false);
        return;
      }
    }

    setUploadQueue({
      total: valid.length,
      completed: 0,
      failed: 0,
      isUploading: true,
    });

    console.info(
      "[ProductForm] Starting queue upload for",
      valid.length,
      "valid file(s)",
    );

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];

      try {
        console.info(`[ProductForm] Uploading file ${i + 1}/${valid.length}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        const compressedFile = await compressImage(file);

        console.info(
          `[ProductForm] Uploading compressed file ${i + 1}/${valid.length}:`,
          {
            name: compressedFile.name,
            type: compressedFile.type,
            size: compressedFile.size,
          },
        );

        const uploadedUrls = await executeProductImageUpload({
          file: compressedFile,
          originalFileName: file.name,
          productId: initialData?.id,
        });
        uploadedUrls.forEach((url) => addImageEntry(url));

        setUploadQueue((prev) => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      } catch (error) {
        console.error(`[ProductForm] Upload failed for ${file.name}:`, error);

        logError(error, {
          layer: "frontend",
          event: "inventory_image_upload_queue",
          fileName: file.name,
          fileIndex: i,
          userAgent: navigator.userAgent,
        });

        setUploadQueue((prev) => ({
          ...prev,
          failed: prev.failed + 1,
          completed: prev.completed + 1,
        }));
      }
    }

    setUploadQueue((prev) => {
      const outcome = summarizeProductImageUploadOutcome(prev);
      setToast(outcome.toast);
      return outcome.nextQueue;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDragging(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleUploadFiles(event.dataTransfer.files);
  };

  const handleAddTag = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    const newTag: TagChip = {
      label: trimmed,
      group_key: "custom",
      source: "custom",
    };

    const existingKeys = new Set(allTags.map(getTagKey));
    if (existingKeys.has(getTagKey(newTag))) {
      return;
    }

    setCustomTags([...customTags, newTag]);
  };

  const applyBrandOverride = (option: CatalogOption | null) => {
    setBrandOverrideId(option?.id ?? null);
    setBrandOverrideInput(option?.label ?? "");
    setModelOverrideId(null);
    setModelOverrideInput("");
  };

  const applyModelOverride = (option: CatalogOption | null) => {
    setModelOverrideId(option?.id ?? null);
    setModelOverrideInput(option?.label ?? "");
  };

  const handleBrandOverrideChange = (value: string) => {
    setBrandOverrideInput(value);
    const match = brandOptions.find(
      (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) {
      applyBrandOverride(match);
    } else {
      setBrandOverrideId(null);
      setModelOverrideId(null);
      setModelOverrideInput("");
    }
  };

  const handleModelOverrideChange = (value: string) => {
    setModelOverrideInput(value);
    const match = modelOptions.find(
      (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) {
      applyModelOverride(match);
    } else {
      setModelOverrideId(null);
    }
  };

  const brandSuggestion = parseResult?.suggestions?.brand;
  const modelSuggestion = parseResult?.suggestions?.model;

  const applyBrandSuggestion = () => {
    if (!brandSuggestion) {
      return;
    }
    const match = brandOptions.find((option) => option.id === brandSuggestion.id);
    if (match) {
      applyBrandOverride(match);
    }
  };

  const applyModelSuggestion = () => {
    if (!modelSuggestion) {
      return;
    }
    const match = modelOptions.find((option) => option.id === modelSuggestion.id);
    if (match) {
      applyModelOverride(match);
    }
  };

  const handleRemoveTag = (tag: TagChip) => {
    if (tag.source === "auto") {
      const key = getTagKey(tag);
      setExcludedAutoTagKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      return;
    }

    setCustomTags(customTags.filter((item) => getTagKey(item) !== getTagKey(tag)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = buildProductCreateInput({
        titleRaw,
        brandOverrideId,
        modelOverrideId,
        category,
        condition,
        sizeType,
        description,
        shippingPrice,
        publishMode,
        scheduledGoLiveAt,
        variants,
        images,
        allTags,
        excludedAutoTagKeys,
      });

      await onSubmit(data);
    } catch (error) {
      logError(error, { layer: "frontend", event: "inventory_form_submit" });
      const message = error instanceof Error ? error.message : "Failed to save product";
      setToast({ message, tone: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-4 md:space-y-6"
    >
      <ProductFormDetailsSection
        titleRaw={titleRaw}
        category={category}
        condition={condition}
        parseStatus={parseStatus}
        parsedBrandLabel={parseResult?.brand?.label || ""}
        parsedModelLabel={parseResult?.model?.label || ""}
        parsedName={parseResult?.name || ""}
        parsedTitleDisplay={parseResult?.titleDisplay ?? null}
        brandSuggestionLabel={brandSuggestion?.label ?? null}
        modelSuggestionLabel={modelSuggestion?.label ?? null}
        brandOverrideInput={brandOverrideInput}
        brandOverrideId={brandOverrideId}
        brandOptions={brandOptions}
        modelOverrideInput={modelOverrideInput}
        modelOverrideId={modelOverrideId}
        modelOptions={modelOptions}
        effectiveBrandId={effectiveBrandId}
        description={description}
        shippingPrice={shippingPrice}
        shippingDefaultsStatus={shippingDefaultsStatus}
        defaultShippingPrice={defaultShippingPrice}
        tags={allTags}
        publishMode={publishMode}
        scheduledGoLiveAt={scheduledGoLiveAt}
        scheduleMin={scheduleMin}
        isLoading={isLoading}
        isEditing={Boolean(initialData?.id)}
        onTitleRawChange={setTitleRaw}
        onCategoryChange={setCategory}
        onConditionChange={setCondition}
        onApplyBrandSuggestion={applyBrandSuggestion}
        onApplyModelSuggestion={applyModelSuggestion}
        onBrandOverrideChange={handleBrandOverrideChange}
        onClearBrandOverride={() => applyBrandOverride(null)}
        onModelOverrideChange={handleModelOverrideChange}
        onClearModelOverride={() => applyModelOverride(null)}
        onDescriptionChange={setDescription}
        onShippingPriceChange={setShippingPrice}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onPublishModeChange={setPublishMode}
        onEnsureScheduledTime={ensureScheduledTime}
        onScheduledGoLiveAtChange={setScheduledGoLiveAt}
        onCancel={onCancel}
      />

      <ProductFormVariantsSection
        variants={variants}
        variantIds={variantIds}
        sizeType={sizeType}
        variantDragSensors={variantDragSensors}
        onAddVariant={addVariant}
        onRemoveVariant={removeVariant}
        onUpdateVariant={updateVariant}
        onHandleVariantDragEnd={handleVariantDragEnd}
        buildSizeOptions={buildSizeOptions}
      />

      <ProductFormMediaSection
        images={images}
        uploadQueue={uploadQueue}
        isDragging={isDragging}
        fileInputRef={fileInputRef}
        onUploadFiles={handleUploadFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onSetPrimaryImage={setPrimaryImage}
        onRemoveImage={removeImage}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </form>
  );
}
