// src/components/inventory/ProductForm.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";

import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { Category, Condition, SizeType } from "@/types/domain/product";
import type { ProductCreateInput } from "@/services/product-service";
import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";
import { RdkSelect } from "@/components/ui/Select";

import { TagInput, type TagChip } from "./TagInput";

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

const isUploadErrorResponse = (value: unknown): value is UploadErrorResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.error === "string" || typeof record.message === "string";
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

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const initialTitle = initialData?.title_raw ?? "";
  const [titleRaw, setTitleRaw] = useState(initialTitle);

  const [parseResult, setParseResult] = useState<TitleParseResult | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "loading" | "error">("idle");

  const [brandOverrideId, setBrandOverrideId] = useState<string | null>(null);
  const [brandOverrideInput, setBrandOverrideInput] = useState("");
  const [modelOverrideId, setModelOverrideId] = useState<string | null>(null);
  const [modelOverrideInput, setModelOverrideInput] = useState("");

  const [brandOptions, setBrandOptions] = useState<CatalogOption[]>([]);
  const [modelOptions, setModelOptions] = useState<CatalogOption[]>([]);

  const [category, setCategory] = useState<Category>(initialData?.category || "sneakers");
  const [condition, setCondition] = useState<Condition>(initialData?.condition || "new");
  const [conditionNote, setConditionNote] = useState(initialData?.condition_note || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const [shippingPrice, setShippingPrice] = useState(() => {
    const shippingOverrideCents = initialData?.shipping_override_cents;
    if (shippingOverrideCents !== null && shippingOverrideCents !== undefined) {
      return formatMoney(shippingOverrideCents / 100);
    }
    return "";
  });

  const [shippingDefaults, setShippingDefaults] = useState<Record<string, number>>({});
  const [shippingDefaultsStatus, setShippingDefaultsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

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

  const [excludedAutoTagKeys, setExcludedAutoTagKeys] = useState<string[]>([]);
  const hasInitializedTags = useRef(false);
  const hasInitializedVariants = useRef(false);

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    const sizeType = getSizeTypeForCategory(initialData?.category || "sneakers");
    const mapped = initialData?.variants?.map((variant) => ({
      size_label: variant.size_label,
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

  useEffect(() => {
    const loadDefaults = async () => {
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
    };

    loadDefaults();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
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
    };

    loadBrands();
  }, []);

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
    if (!hasInitializedVariants.current) {
      hasInitializedVariants.current = true;
      return;
    }

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

  useEffect(() => {
    if (hasInitializedTags.current || !initialData?.tags) {
      return;
    }

    const existingKeys = new Set(initialData.tags.map(getTagKey));
    const missing = autoTags.map(getTagKey).filter((key) => !existingKeys.has(key));

    setExcludedAutoTagKeys(missing);
    hasInitializedTags.current = true;
  }, [autoTags, initialData?.tags]);

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

  const validateAndPrepareFiles = (
    fileList: FileList,
  ): {
    valid: File[];
    errors: string[];
  } => {
    const valid: File[] = [];
    const errors: string[] = [];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    Array.from(fileList).forEach((file) => {
      console.info("[ProductForm] Validating file:", {
        name: file.name,
        type: file.type || "NO TYPE",
        size: file.size,
      });

      // Check for HEIC/HEIF (iOS default format)
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
        errors.push(
          `${file.name}: HEIC/HEIF not supported. Please convert to JPG in Photos app first.`,
        );
        return;
      }

      // Check file size
      if (file.size === 0) {
        errors.push(`${file.name}: File is empty`);
        return;
      }

      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      // Check MIME type
      // iOS sometimes doesn't provide file.type, so we check extension too
      const hasValidType = file.type && ALLOWED_TYPES.includes(file.type);
      const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(fileName);

      if (!hasValidType && !hasValidExtension) {
        errors.push(`${file.name}: Not a supported image type (use JPG, PNG, or WebP)`);
        return;
      }

      // If type is missing but extension is valid, it's likely iOS
      if (!file.type && hasValidExtension) {
        console.info(
          "[ProductForm] iOS file detected (no MIME type), accepting based on extension",
        );
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  // Then update handleUploadFiles to use this:

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    console.info("[ProductForm] Received", files.length, "file(s) for upload");

    // Validate files first
    const { valid, errors } = validateAndPrepareFiles(files);

    if (errors.length > 0) {
      console.error("[ProductForm] Validation errors:", errors);
      setToast({
        message: errors.join("; "),
        tone: "error",
      });

      // If some files are valid, continue with those
      if (valid.length === 0) {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setIsDragging(false);
        return;
      }
    }

    console.info("[ProductForm] Starting upload for", valid.length, "valid file(s)");

    try {
      const fd = new FormData();

      // Add ALL valid files to FormData with 'files' field name for batch upload
      valid.forEach((file) => {
        fd.append("files", file);
        console.info("[ProductForm] Added file to FormData:", {
          name: file.name,
          type: file.type || "detected from extension",
          size: file.size,
        });
      });

      // If editing an existing product, pass productId for folder placement
      if (initialData?.id) {
        fd.append("productId", initialData.id);
      }

      console.info(
        "[ProductForm] Sending batch upload request to /api/admin/uploads/product-image",
      );

      const res = await fetch("/api/admin/uploads/product-image", {
        method: "POST",
        body: fd,
      });

      console.info("[ProductForm] Upload response status:", res.status);

      let json: unknown = null;
      try {
        json = await res.json();
        console.info("[ProductForm] Upload response body:", json);
      } catch (parseError) {
        console.error("[ProductForm] Failed to parse response JSON:", parseError);
        throw new Error("Invalid server response");
      }

      if (!res.ok) {
        const errorMsg = isUploadErrorResponse(json)
          ? json.error || json.message
          : "Image upload failed";
        console.error(
          "[ProductForm] Upload failed with status",
          res.status,
          ":",
          errorMsg,
        );
        throw new Error(errorMsg);
      }

      // Handle response - could be single image or multiple
      let uploadedCount = 0;

      if (isUploadsResponse(json)) {
        // Multiple images response
        console.info("[ProductForm] Processing", json.uploads.length, "uploaded images");
        const uploads = json.uploads.filter(isUploadResult);
        if (uploads.length !== json.uploads.length) {
          throw new Error("Unexpected response format from server");
        }

        uploads.forEach((upload) => {
          addImageEntry(upload.url);
          uploadedCount++;
        });

        const failures = Array.isArray(json.failures) ? json.failures : [];
        if (failures.length > 0) {
          console.warn("[ProductForm] Some uploads failed:", failures);
          setToast({
            message: `${uploadedCount} uploaded successfully, ${failures.length} failed`,
            tone: "info",
          });
        } else {
          setToast({
            message: `${uploadedCount} image(s) uploaded successfully`,
            tone: "success",
          });
        }
      } else if (isUploadResult(json)) {
        // Single image response (backward compatibility)
        console.info("[ProductForm] Adding single image:", json.url);
        addImageEntry(json.url);
        uploadedCount = 1;
        setToast({
          message: "Image uploaded successfully",
          tone: "success",
        });
      } else {
        console.error("[ProductForm] Unexpected response format:", json);
        throw new Error("Unexpected response format from server");
      }

      if (uploadedCount === 0) {
        throw new Error("No images were successfully uploaded");
      }
    } catch (error) {
      console.error("[ProductForm] Upload error:", error);
      logError(error, {
        layer: "frontend",
        event: "inventory_image_upload",
        fileCount: valid.length,
        userAgent: navigator.userAgent,
      });

      const message =
        error instanceof Error ? error.message : "Failed to upload image(s)";
      setToast({ message, tone: "error" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsDragging(false);
    }
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
        title_raw: trimmedTitle,
        brand_override_id: brandOverrideId ?? undefined,
        model_override_id: modelOverrideId ?? undefined,
        category,
        condition,
        condition_note: conditionNote || undefined,
        description: description || undefined,
        shipping_override_cents: shippingCents ?? undefined,
        variants: preparedVariants,
        images: preparedImages,
        tags: allTags.map((tag) => ({ label: tag.label, group_key: tag.group_key })),
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
      className="space-y-6"
    >
      {/* Basic Info */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm mb-1">
              Full Title <RequiredMark />
            </label>
            <input
              type="text"
              value={titleRaw}
              onChange={(e) => setTitleRaw(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <p className="text-xs text-gray-500 mt-2">
              One input only. We parse brand, model (sneakers), and name automatically.
            </p>
          </div>

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
                { value: "used", label: "Used" },
              ]}
              buttonClassName="bg-zinc-800"
            />
          </div>
        </div>

        <div className="mt-4 bg-zinc-950/40 border border-zinc-800/70 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-300 font-semibold">Parsed Preview</h3>
            {parseStatus === "loading" && (
              <span className="text-xs text-gray-500">Parsing...</span>
            )}
            {parseStatus === "error" && (
              <span className="text-xs text-red-400">Unable to parse title</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Override Brand</label>
            <input
              type="text"
              list="brand-options"
              value={brandOverrideInput}
              onChange={(e) => handleBrandOverrideChange(e.target.value)}
              placeholder="Search brands..."
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-zinc-700/40"
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
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-zinc-700/40"
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
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="block text-gray-400 text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>

      {/* Variants */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition"
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
                  <label className="block text-gray-400 text-xs mb-1">
                    Size <RequiredMark />
                  </label>

                  {sizeType === "shoe" && (
                    <RdkSelect
                      value={variant.size_label}
                      onChange={(v) => updateVariant(index, "size_label", v)}
                      placeholder="Select…"
                      options={[
                        { value: "", label: "Select…" },
                        ...SHOE_SIZES.map((size) => ({ value: size, label: size })),
                      ]}
                      buttonClassName="bg-zinc-900"
                    />
                  )}

                  {sizeType === "clothing" && (
                    <RdkSelect
                      value={variant.size_label}
                      onChange={(v) => updateVariant(index, "size_label", v)}
                      placeholder="Select…"
                      options={[
                        { value: "", label: "Select…" },
                        ...CLOTHING_SIZES.map((size) => ({ value: size, label: size })),
                      ]}
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
                      className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  )}

                  {sizeType === "none" && (
                    <input
                      type="text"
                      value="N/A"
                      disabled
                      className="w-full bg-zinc-900 text-gray-500 px-3 py-2 rounded text-sm border border-zinc-800/70"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Selling for Price ($) <RequiredMark />
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Bought for Price ($) <RequiredMark />
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={variant.cost}
                    onChange={(e) => updateVariant(index, "cost", e.target.value)}
                    required
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
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
                    className="w-full bg-zinc-900 text-white px-3 py-2 rounded text-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-red-500 hover:text-red-400 p-2 rounded hover:bg-zinc-900"
                  aria-label="Remove variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Images <RequiredMark />
          </h2>
          <span className="text-xs text-gray-500">{images.length} total</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          capture={undefined} // Don't force camera, allow gallery selection
          onChange={(e) => {
            console.info(
              "[ProductForm] File input changed, files:",
              e.target.files?.length || 0,
            );
            void handleUploadFiles(e.target.files);
          }}
          className="hidden"
        />

        {/* Full-width Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "w-full h-44 border border-dashed cursor-pointer transition",
            "rounded",
            "px-4 py-3 flex items-center gap-3",
            isDragging
              ? "border-red-500 bg-red-900/10"
              : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-950/50",
          ].join(" ")}
        >
          <div className="h-10 w-10 bg-zinc-900 border border-zinc-800/70 flex items-center justify-center shrink-0 rounded">
            <ImagePlus className="w-5 h-5 text-gray-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-semibold truncate">
              Drag & drop images
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Or click to browse. PNG, JPG, WEBP.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              First image becomes primary (you can change it below).
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="text-xs font-semibold bg-zinc-900 border border-zinc-800/70 px-3 py-2 rounded hover:bg-zinc-800"
          >
            Browse
          </button>
        </div>

        {/* Thumbnails BELOW primary */}
        <div className="mt-4">
          {images.length === 0 ? (
            <div className="text-gray-500 text-sm">No images yet.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
                  title="Click to set primary"
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
                        "text-[10px] px-2 py-0.5 border",
                        "rounded",
                        image.is_primary
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-black/50 border-white/10 text-gray-200",
                      ].join(" ")}
                    >
                      {image.is_primary ? "Primary" : "Thumb"}
                    </span>
                  </div>

                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Add at least one image. Click any thumbnail to promote it to primary.
        </div>
      </div>

      {/* Pricing & Shipping */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Pricing & Shipping</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Shipping Price ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={shippingPrice}
              onChange={(e) => setShippingPrice(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />

            {shippingDefaultsStatus === "loading" ? (
              <p className="text-gray-500 text-xs mt-1">
                Loading default shipping prices…
              </p>
            ) : shippingDefaultsStatus === "error" ? (
              <p className="text-red-400 text-xs mt-1">
                Could not load default shipping prices. (You can still set an override.)
              </p>
            ) : (
              <p className="text-gray-500 text-xs mt-1">
                Leave blank to use the {category} default:{" "}
                <span className="text-gray-200">
                  ${formatMoney(defaultShippingPrice)}
                </span>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
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
          {isLoading
            ? "Saving..."
            : initialData?.id
              ? "Update Product"
              : "Create Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded transition"
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
