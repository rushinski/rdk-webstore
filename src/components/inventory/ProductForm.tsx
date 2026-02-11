// src/components/inventory/ProductForm.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";

import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { Category, Condition, SizeType } from "@/types/domain/product";
import type { ProductCreateInput } from "@/services/product-service";
import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";
import { RdkSelect } from "@/components/ui/Select";

import { TagInput, type TagChip } from "./TagInput";

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

type VariantDraft = {
  size_label: string;
  price: string;
  cost: string;
  stock: string;
};

type ImageDraft = ProductCreateInput["images"][number];

type CatalogOption = {
  id: string;
  label: string;
  groupKey?: string | null;
};

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

type UploadResult = {
  url: string;
  path?: string;
  mimeType?: string;
  bytes?: number;
  hash?: string;
  bucket?: string;
};

type UploadFailure = {
  index?: number;
  fileName?: string;
  error?: string;
};

type UploadsResponse = {
  uploads: UploadResult[];
  count?: number;
  failures?: UploadFailure[];
  requestId?: string;
};

type UploadErrorResponse = {
  error?: string;
  message?: string;
  requestId?: string;
  details?: unknown;
};

const isUploadResult = (value: unknown): value is UploadResult => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.url === "string";
};

const isUploadsResponse = (value: unknown): value is UploadsResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Array.isArray(record.uploads);
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

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  initialShippingDefaults, // NEW
  initialBrands, // NEW
}: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const initialTitle = initialData?.title_raw ?? "";
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
  const [conditionNote, setConditionNote] = useState(initialData?.condition_note || "");
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
    const shippingOverrideCents = initialData?.shipping_override_cents;
    if (shippingOverrideCents !== null && shippingOverrideCents !== undefined) {
      return formatMoney(shippingOverrideCents / 100);
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
    const mapped = initialData?.variants?.map((variant) => ({
      size_label: variant.size_label?.trim() ?? "",
      price: formatMoney(variant.price_cents / 100),
      cost: formatMoney((variant.cost_cents ?? 0) / 100),
      stock: String(variant.stock ?? 0),
    }));

    return (
      mapped || [
        {
          size_label: sizeType === "none" ? "N/A" : "",
          price: "",
          cost: "",
          stock: "1",
        },
      ]
    );
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
  const defaultShippingPrice = shippingDefaults[category] ?? 0;
  const scheduleMin = useMemo(
    () => toDateTimeLocalValue(new Date().toISOString()),
    [],
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

  const isUploadErrorResponse = (value: unknown): value is UploadErrorResponse => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as Record<string, unknown>;
    return typeof record.error === "string" || typeof record.message === "string";
  };

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
    setVariants([
      ...variants,
      {
        size_label: sizeType === "none" ? "N/A" : "",
        price: "",
        cost: "",
        stock: "1",
      },
    ]);
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

  const validateAndPrepareFiles = (
    fileList: FileList,
  ): {
    valid: File[];
    errors: string[];
  } => {
    const valid: File[] = [];
    const errors: string[] = [];
    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    const filesArray = Array.from(fileList);
    console.info("[validateAndPrepareFiles] Validating", filesArray.length, "files");

    filesArray.forEach((file, index) => {
      console.info(`[validateAndPrepareFiles] File ${index + 1}:`, {
        name: file.name,
        type: file.type || "NO TYPE",
        size: file.size,
      });

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
        errors.push(
          `${file.name}: HEIC/HEIF not supported. Please convert to JPG in Photos app first.`,
        );
        return;
      }

      if (file.size === 0) {
        errors.push(`${file.name}: File is empty`);
        return;
      }

      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      const hasValidType = file.type && ALLOWED_TYPES.includes(file.type);
      const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(fileName);

      if (!hasValidType && !hasValidExtension) {
        errors.push(`${file.name}: Not a supported image type (use JPG, PNG, or WebP)`);
        return;
      }

      if (!file.type && hasValidExtension) {
        console.info(
          `[validateAndPrepareFiles] iOS file detected (no MIME type), accepting based on extension`,
        );
      }

      valid.push(file);
    });

    console.info("[validateAndPrepareFiles] Result:", {
      valid: valid.length,
      errors: errors.length,
    });

    return { valid, errors };
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    console.info("[ProductForm] Received", files.length, "file(s) for upload");
    console.info("[ProductForm] User agent:", navigator.userAgent);

    const fileArray = Array.from(files);
    console.info("[ProductForm] Converted to array, length:", fileArray.length);

    const { valid, errors } = validateAndPrepareFiles(files);

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

        const fd = new FormData();
        fd.append("file", compressedFile, file.name);

        if (initialData?.id) {
          fd.append("productId", initialData.id);
        }

        const res = await fetch("/api/admin/uploads/product-image", {
          method: "POST",
          body: fd,
        });

        const responseText = await res.text();
        console.info(`[ProductForm] Response for file ${i + 1}:`, res.status);

        let json: unknown = null;
        try {
          json = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[ProductForm] JSON parse error:", parseError);
          throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`);
        }

        if (!res.ok) {
          const errorMsg = isUploadErrorResponse(json)
            ? json.error || json.message
            : "Image upload failed";
          throw new Error(errorMsg);
        }

        if (isUploadsResponse(json)) {
          json.uploads.forEach((upload) => {
            if (isUploadResult(upload)) {
              addImageEntry(upload.url);
            }
          });
        } else if (isUploadResult(json)) {
          addImageEntry(json.url);
        }

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
      const successCount = prev.total - prev.failed;

      if (prev.failed === 0) {
        setToast({
          message: `${successCount} image(s) uploaded successfully`,
          tone: "success",
        });
      } else if (successCount === 0) {
        setToast({
          message: `All ${prev.failed} upload(s) failed`,
          tone: "error",
        });
      } else {
        setToast({
          message: `${successCount} succeeded, ${prev.failed} failed`,
          tone: "info",
        });
      }

      return {
        ...prev,
        isUploading: false,
      };
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

  const parseMoneyToCents = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.round(parsed * 100);
  };

  const parseStockCount = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.max(parsed, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trimmedTitle = titleRaw.trim();
      if (!trimmedTitle) {
        throw new Error("Full title is required.");
      }

      const trimmedShipping = shippingPrice.trim();
      const shippingCents = trimmedShipping ? parseMoneyToCents(trimmedShipping) : null;
      if (trimmedShipping && shippingCents === null) {
        throw new Error("Please enter a valid shipping price.");
      }

      const seenSizeKeys = new Set<string>();
      const preparedVariants = variants.map((variant, index) => {
        const priceCents = parseMoneyToCents(variant.price);
        if (priceCents === null) {
          throw new Error(`Variant ${index + 1} price is invalid.`);
        }

        const costCents = parseMoneyToCents(variant.cost);
        if (costCents === null) {
          throw new Error(`Variant ${index + 1} cost is invalid.`);
        }

        const stockCount = parseStockCount(variant.stock);
        if (stockCount === null) {
          throw new Error(`Variant ${index + 1} stock is invalid.`);
        }

        const sizeLabel = sizeType === "none" ? "N/A" : variant.size_label.trim();
        if (sizeType !== "none" && !sizeLabel) {
          throw new Error(`Variant ${index + 1} size is required.`);
        }
        const sizeKey = `${sizeType}:${sizeLabel.toLowerCase()}`;
        if (seenSizeKeys.has(sizeKey)) {
          throw new Error(`Duplicate size "${sizeLabel}" found in variants.`);
        }
        seenSizeKeys.add(sizeKey);

        return {
          size_type: sizeType,
          size_label: sizeLabel,
          price_cents: priceCents,
          cost_cents: costCents,
          stock: stockCount,
        };
      });

      const preparedImages = normalizeImages(images)
        .map((image) => ({
          url: image.url.trim(),
          sort_order: image.sort_order,
          is_primary: image.is_primary,
        }))
        .filter((image) => image.url);

      if (preparedImages.length === 0) {
        throw new Error("Please add at least one product image.");
      }

      let goLiveAt = new Date().toISOString();
      if (publishMode === "scheduled") {
        const value = scheduledGoLiveAt.trim();
        if (!value) {
          throw new Error("Please choose a go-live date and time.");
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Go-live date/time is invalid.");
        }
        const nowMinute = new Date();
        nowMinute.setSeconds(0, 0);
        if (parsed.getTime() < nowMinute.getTime()) {
          throw new Error("Go-live date/time cannot be in the past.");
        }
        goLiveAt = parsed.toISOString();
      }

      const data: ProductCreateInput = {
        title_raw: trimmedTitle,
        brand_override_id: brandOverrideId ?? undefined,
        model_override_id: modelOverrideId ?? undefined,
        category,
        condition,
        condition_note: conditionNote || undefined,
        description: description || undefined,
        shipping_override_cents: shippingCents ?? undefined,
        go_live_at: goLiveAt,
        variants: preparedVariants,
        images: preparedImages,
        tags: allTags.map((tag) => ({ label: tag.label, group_key: tag.group_key })),
        excluded_auto_tag_keys: excludedAutoTagKeys,
      };

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
      {/* MOBILE OPTIMIZATION: Improved mobile layout */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          Basic Information
        </h2>

        <div className="space-y-4">
          {/* Full width title on mobile */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Full Title <RequiredMark />
            </label>
            <input
              type="text"
              value={titleRaw}
              onChange={(e) => setTitleRaw(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm md:text-base"
            />
            <p className="text-xs text-gray-500 mt-2">
              One input only. We parse brand, model (sneakers), and name automatically.
            </p>
          </div>

          {/* Stack category/condition on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Category <RequiredMark />
              </label>
              <RdkSelect
                value={category}
                onChange={(v) => setCategory(v as Category)}
                options={[
                  { value: "sneakers", label: "Sneakers" },
                  { value: "clothing", label: "Clothing" },
                  { value: "accessories", label: "Accessories" },
                  { value: "electronics", label: "Electronics" },
                ]}
                buttonClassName="bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Condition <RequiredMark />
              </label>
              <RdkSelect
                value={condition}
                onChange={(v) => setCondition(v as Condition)}
                options={[
                  { value: "new", label: "New" },
                  { value: "used", label: "Pre-owned" },
                ]}
                buttonClassName="bg-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* Parsed Preview - Collapsible on mobile */}
        <div className="mt-4 bg-zinc-950/40 border border-zinc-800/70 rounded p-3 md:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-300 font-semibold">Parsed Preview</h3>
            {parseStatus === "loading" && (
              <span className="text-xs text-gray-500">Parsing...</span>
            )}
            {parseStatus === "error" && (
              <span className="text-xs text-red-400">Unable to parse title</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-sm">
            <div className="text-gray-400">
              <span className="block text-xs uppercase text-gray-500">Brand</span>
              <span className="text-white">{parseResult?.brand?.label || "-"}</span>
            </div>
            {category === "sneakers" && (
              <div className="text-gray-400">
                <span className="block text-xs uppercase text-gray-500">Model</span>
                <span className="text-white">{parseResult?.model?.label || "-"}</span>
              </div>
            )}
            <div className="text-gray-400">
              <span className="block text-xs uppercase text-gray-500">Name</span>
              <span className="text-white">{parseResult?.name || "-"}</span>
            </div>
          </div>

          {parseResult?.titleDisplay && (
            <div className="text-xs text-gray-500">
              Display: <span className="text-gray-200">{parseResult.titleDisplay}</span>
            </div>
          )}

          {(brandSuggestion || modelSuggestion) && (
            <div className="flex flex-wrap gap-2">
              {brandSuggestion && (
                <button
                  type="button"
                  onClick={applyBrandSuggestion}
                  className="text-xs px-3 py-1 rounded-full border border-zinc-700/70 text-red-200 hover:bg-red-900/30"
                >
                  Did you mean {brandSuggestion.label}?
                </button>
              )}
              {category === "sneakers" && modelSuggestion && (
                <button
                  type="button"
                  onClick={applyModelSuggestion}
                  className="text-xs px-3 py-1 rounded-full border border-zinc-700/70 text-red-200 hover:bg-red-900/30"
                >
                  Did you mean {modelSuggestion.label}?
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stack overrides on mobile */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Override Brand</label>
            <input
              type="text"
              list="brand-options"
              value={brandOverrideInput}
              onChange={(e) => handleBrandOverrideChange(e.target.value)}
              placeholder="Search brands..."
              className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-zinc-700/40 text-sm md:text-base"
            />
            <datalist id="brand-options">
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.label} />
              ))}
            </datalist>
            {brandOverrideId && (
              <button
                type="button"
                onClick={() => applyBrandOverride(null)}
                className="text-xs text-gray-500 mt-2 hover:text-white"
              >
                Clear override
              </button>
            )}
          </div>

          {category === "sneakers" && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">Override Model</label>
              <input
                type="text"
                list="model-options"
                value={modelOverrideInput}
                onChange={(e) => handleModelOverrideChange(e.target.value)}
                placeholder={
                  effectiveBrandId ? "Search models..." : "Select a brand first"
                }
                disabled={!effectiveBrandId}
                className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-zinc-700/40 text-sm md:text-base"
              />
              <datalist id="model-options">
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.label} />
                ))}
              </datalist>
              {modelOverrideId && (
                <button
                  type="button"
                  onClick={() => applyModelOverride(null)}
                  className="text-xs text-gray-500 mt-2 hover:text-white"
                >
                  Clear override
                </button>
              )}
            </div>
          )}
        </div>

        {condition === "used" && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-1">Condition Note</label>
            <textarea
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm md:text-base"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="block text-gray-400 text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm md:text-base"
          />
        </div>
      </div>

      {/* Variants - Better mobile layout */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 md:gap-2 bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm transition"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Add Variant</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        <div className="space-y-3 md:space-y-4">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="bg-zinc-800 p-3 md:p-4 rounded flex flex-col sm:flex-row gap-3 md:gap-4"
            >
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-gray-400 text-xs mb-1">
                    Size <RequiredMark />
                  </label>

                  {sizeType === "shoe" && (
                    <RdkSelect
                      value={variant.size_label}
                      onChange={(v) => updateVariant(index, "size_label", v)}
                      placeholder="Select..."
                      searchable
                      searchPlaceholder="Search sizes..."
                      options={buildSizeOptions(SHOE_SIZES, variant.size_label)}
                      buttonClassName="bg-zinc-900"
                    />
                  )}

                  {sizeType === "clothing" && (
                    <RdkSelect
                      value={variant.size_label}
                      onChange={(v) => updateVariant(index, "size_label", v)}
                      placeholder="Select..."
                      searchable
                      searchPlaceholder="Search sizes..."
                      options={buildSizeOptions(CLOTHING_SIZES, variant.size_label)}
                      buttonClassName="bg-zinc-900"
                    />
                  )}

                  {sizeType === "custom" && (
                    <input
                      type="text"
                      value={variant.size_label}
                      onChange={(e) => updateVariant(index, "size_label", e.target.value)}
                      required
                      placeholder="e.g., One Size"
                      className="w-full bg-zinc-900 text-white px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  )}

                  {sizeType === "none" && (
                    <input
                      type="text"
                      value="N/A"
                      disabled
                      className="w-full bg-zinc-900 text-gray-500 px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Price ($) <RequiredMark />
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Cost ($) <RequiredMark />
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.cost}
                    onChange={(e) => updateVariant(index, "cost", e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Stock <RequiredMark />
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-red-500 hover:text-red-400 p-2 rounded hover:bg-zinc-900 self-start sm:self-center"
                  aria-label="Remove variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Images - Mobile optimized */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">
            Images <RequiredMark />
          </h2>
          <span className="text-xs text-gray-500">{images.length} total</span>
        </div>

        {uploadQueue.isUploading && (
          <div className="mb-4 bg-blue-900/20 border border-blue-800/50 rounded p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-blue-200 font-semibold">
                {uploadQueue.currentStatus || "Uploading images..."}
              </span>
              <span className="text-xs text-blue-300">
                {uploadQueue.completed} / {uploadQueue.total}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${(uploadQueue.completed / uploadQueue.total) * 100}%`,
                }}
              />
            </div>
            {uploadQueue.failed > 0 && (
              <p className="text-xs text-red-400 mt-2">
                {uploadQueue.failed} upload(s) failed
              </p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            console.info(
              "[ProductForm] File input changed, files:",
              e.target.files?.length || 0,
            );
            if (e.target.files) {
              console.info(
                "[ProductForm] File details:",
                Array.from(e.target.files).map((f) => ({
                  name: f.name,
                  type: f.type,
                  size: f.size,
                })),
              );
            }
            void handleUploadFiles(e.target.files);
          }}
          className="hidden"
        />

        {/* Mobile-friendly dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "w-full h-32 md:h-44 border border-dashed cursor-pointer transition",
            "rounded px-3 md:px-4 py-3 flex flex-col sm:flex-row items-center gap-2 md:gap-3",
            isDragging
              ? "border-red-500 bg-red-900/10"
              : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-950/50",
          ].join(" ")}
        >
          <div className="h-8 w-8 md:h-10 md:w-10 bg-zinc-900 border border-zinc-800/70 flex items-center justify-center shrink-0 rounded">
            <ImagePlus className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs md:text-sm text-white font-semibold">
              Tap to add images
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP. Max 10MB each.</p>
          </div>
        </div>

        {/* Mobile-friendly image grid */}
        <div className="mt-3 md:mt-4">
          {images.length === 0 ? (
            <div className="text-gray-500 text-xs md:text-sm">No images yet.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
              {images.map((image, index) => (
                <div
                  key={index}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPrimaryImage(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPrimaryImage(index);
                    }
                  }}
                  className={[
                    "group relative text-left border overflow-hidden transition",
                    "rounded cursor-pointer select-none",
                    image.is_primary
                      ? "border-red-500"
                      : "border-zinc-800/70 hover:border-zinc-700",
                  ].join(" ")}
                  title="Tap to set primary"
                >
                  <div className="aspect-square bg-zinc-900 overflow-hidden">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        Missing
                      </div>
                    )}
                  </div>

                  <div className="absolute top-1 left-1">
                    <span
                      className={[
                        "text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 border rounded",
                        image.is_primary
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-black/50 border-white/10 text-gray-200",
                      ].join(" ")}
                    >
                      {image.is_primary ? "Primary" : "Thumb"}
                    </span>
                  </div>

                  <div className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="bg-black/60 hover:bg-black/80 text-white p-1 md:p-1.5 rounded"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 md:mt-3 text-xs text-gray-500">
          Add at least one image. Tap any thumbnail to set as primary.
        </div>
      </div>

      {/* Pricing & Shipping - Simplified */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          Pricing & Shipping
        </h2>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Shipping Price ($)</label>
          <input
            type="text"
            inputMode="decimal"
            value={shippingPrice}
            onChange={(e) => setShippingPrice(e.target.value)}
            className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm md:text-base"
          />

          {shippingDefaultsStatus === "loading" ? (
            <p className="text-gray-500 text-xs mt-1">Loading default shipping prices…</p>
          ) : shippingDefaultsStatus === "error" ? (
            <p className="text-red-400 text-xs mt-1">
              Could not load defaults. You can still set an override.
            </p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">
              Leave blank to use {category} default:{" "}
              <span className="text-gray-200">${formatMoney(defaultShippingPrice)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Tags</h2>
        <TagInput tags={allTags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-2">Posting Schedule</h2>
        <p className="text-xs md:text-sm text-gray-400">
          Products post immediately by default. Switch to scheduled posting to pick a
          future go-live date and time.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm text-white cursor-pointer select-none">
            <input
              type="radio"
              name="publish-mode"
              checked={publishMode === "immediately"}
              onChange={() => setPublishMode("immediately")}
              className="h-4 w-4 cursor-pointer accent-red-600"
            />
            <span>Post immediately</span>
          </label>
          <label className="flex items-center gap-3 text-sm text-white cursor-pointer select-none">
            <input
              type="radio"
              name="publish-mode"
              checked={publishMode === "scheduled"}
              onChange={() => {
                setPublishMode("scheduled");
                ensureScheduledTime();
              }}
              className="h-4 w-4 cursor-pointer accent-red-600"
            />
            <span>Schedule date and time</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-gray-400 text-sm mb-1">
            Go Live Date & Time
            {publishMode === "scheduled" && (
              <>
                {" "}
                <RequiredMark />
              </>
            )}
          </label>
          <input
            type="datetime-local"
            value={scheduledGoLiveAt}
            min={scheduleMin}
            disabled={publishMode !== "scheduled"}
            onChange={(event) => setScheduledGoLiveAt(event.target.value)}
            className="w-full sm:w-auto bg-zinc-800 text-white px-3 md:px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          />
          <p className="text-xs text-gray-500 mt-2">
            {publishMode === "scheduled"
              ? "This uses your local timezone and converts to UTC when saved."
              : "Posting immediately. Choose 'Schedule date and time' to enable this field."}
          </p>
        </div>
      </div>

      {/* Actions - Mobile friendly */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 sticky bottom-0 sm:static bg-black sm:bg-transparent p-4 sm:p-0 -mx-4 sm:mx-0 border-t sm:border-0 border-zinc-800">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded transition text-sm md:text-base"
        >
          {isLoading
            ? "Saving..."
            : initialData?.id
              ? "Update Product"
              : "Create Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded transition text-sm md:text-base"
        >
          Cancel
        </button>
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </form>
  );
}
