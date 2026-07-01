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
import {
  applyBrandOverrideOption,
  applyCatalogSuggestion,
  applyModelOverrideOption,
  resolveBrandOverrideChange,
  resolveEffectiveBrandId,
  resolveModelOverrideChange,
} from "./product-form/catalogOverrides";
import {
  buildShippingDefaultsMap,
  isAbortLikeError,
  shouldClearInvalidModelOverride,
} from "./product-form/catalogData";
import {
  fetchBrandCatalogOptions,
  fetchModelCatalogOptions,
  fetchShippingDefaults,
  requestTitleParse,
} from "./product-form/catalogRequests";
import { ProductFormDetailsSection } from "./product-form/ProductFormDetailsSection";
import { buildProductCreateInput } from "./product-form/buildProductCreateInput";
import { compressProductImageFile } from "./product-form/compressProductImageFile";
import { executeProductImageUpload } from "./product-form/executeProductImageUpload";
import { handleProductImageUpload } from "./product-form/handleProductImageUpload";
import {
  appendImageDraft,
  normalizeImageDrafts,
  removeImageDraftAt,
  setPrimaryImageDraftAt,
} from "./product-form/imageDrafts";
import { ProductFormMediaSection } from "./product-form/ProductFormMediaSection";
import { ProductFormVariantsSection } from "./product-form/ProductFormVariantsSection";
import { runProductImageUploadBatch } from "./product-form/runProductImageUploadBatch";
import {
  applyBrandOverrideState,
  applyModelOverrideState,
  finalizeProductImageUploadUi,
} from "./product-form/stateAppliers";
import { submitProductForm } from "./product-form/submitProductForm";
import { summarizeProductImageUploadOutcome } from "./product-form/summarizeProductImageUploadOutcome";
import {
  AUTO_TAG_GROUP_KEYS,
  appendUniqueCustomTag,
  buildAutoTags,
  filterExcludedTags,
  mergeUniqueTags,
  removeTagSelection,
} from "./product-form/tagHelpers";
import { validateProductImageFiles } from "./product-form/validateProductImageFiles";
import {
  buildVariantSizeOptions,
  createEmptyVariantDraft,
  reorderVariantsByDraftId,
  resetVariantsForSizeType,
  shouldHandleVariantDrag,
  updateVariantFieldAt,
} from "./product-form/variantHelpers";
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
    return buildShippingDefaultsMap(initialShippingDefaults);
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
    normalizeImageDrafts(initialData?.images ?? []),
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

  const autoTags = useMemo(
    () =>
      buildAutoTags({
        parsedBrandLabel,
        parsedBrandGroup,
        parsedModelLabel,
        category,
        condition,
        sizeType,
        variants,
      }),
    [
      parsedBrandLabel,
      parsedBrandGroup,
      parsedModelLabel,
      category,
      condition,
      sizeType,
      variants,
    ],
  );

  const visibleAutoTags = useMemo(
    () => filterExcludedTags(autoTags, excludedAutoTagKeys),
    [autoTags, excludedAutoTagKeys],
  );

  const allTags = useMemo(
    () => mergeUniqueTags(visibleAutoTags, customTags),
    [visibleAutoTags, customTags],
  );

  // OPTIMIZATION: Memoize shipping defaults loader
  const loadShippingDefaults = useCallback(async () => {
    setShippingDefaultsStatus("loading");
    try {
      const result = await fetchShippingDefaults(fetch);
      if (result.shippingDefaults) {
        setShippingDefaults(result.shippingDefaults);
      }
      setShippingDefaultsStatus(result.status);
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
      setBrandOptions(await fetchBrandCatalogOptions(fetch));
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

  const effectiveBrandId = resolveEffectiveBrandId(
    brandOverrideId,
    parseResult?.brand?.id ?? null,
  );

  useEffect(() => {
    if (!effectiveBrandId) {
      setModelOptions([]);
      return;
    }

    const loadModels = async () => {
      try {
        setModelOptions(await fetchModelCatalogOptions(fetch, effectiveBrandId));
      } catch (error) {
        logError(error, { layer: "frontend", event: "inventory_load_model_catalog" });
      }
    };

    loadModels();
  }, [effectiveBrandId]);

  useEffect(() => {
    if (shouldClearInvalidModelOverride(modelOverrideId, modelOptions)) {
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
        setParseResult(
          await requestTitleParse(
            {
              titleRaw,
              category,
              brandOverrideId,
              modelOverrideId,
            },
            fetch,
            controller.signal,
          ),
        );
        setParseStatus("idle");
      } catch (error: unknown) {
        if (isAbortLikeError(error)) {
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

    setVariants((current) => resetVariantsForSizeType(current, sizeType));
  }, [sizeType]);

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      createEmptyVariantDraft({ sizeType, createVariantDraftId, createDraftSku }),
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: string) => {
    setVariants((current) => updateVariantFieldAt(current, index, field, value));
  };

  const handleVariantDragEnd = (event: DragEndEvent) => {
    if (!shouldHandleVariantDrag(event)) {
      return;
    }

    setVariants((current) => {
      return reorderVariantsByDraftId(
        current,
        String(event.active.id),
        String(event.over.id),
        arrayMove,
      );
    });
  };

  const buildSizeOptions = (
    sizes: readonly string[],
    selectedValue: string,
  ): { value: string; label: string }[] => {
    return buildVariantSizeOptions(sizes, selectedValue);
  };

  const addImageEntry = (url: string) => {
    setImages((current) => appendImageDraft(current, url));
  };

  const removeImage = (index: number) => {
    setImages((current) => removeImageDraftAt(current, index));
  };

  const setPrimaryImage = (index: number) => {
    setImages((current) => setPrimaryImageDraftAt(current, index));
  };

  // OPTIMIZATION: Lazy load compression and memoize function
  const compressImage = useCallback(
    async (file: File): Promise<File> =>
      compressProductImageFile({
        file,
        loadImageCompression,
        logError,
        info: console.info,
        error: console.error,
      }),
    [],
  );

  const handleUploadFiles = async (files: FileList | null) => {
    console.info("[ProductForm] Received", files?.length ?? 0, "file(s) for upload");
    console.info("[ProductForm] User agent:", navigator.userAgent);

    await handleProductImageUpload({
      files,
      validateFiles: (fileArray) => {
        console.info("[ProductForm] Converted to array, length:", fileArray.length);
        const result = validateProductImageFiles(fileArray);
        if (result.errors.length > 0) {
          console.error("[ProductForm] Validation errors:", result.errors);
        }
        return result;
      },
      runUploadBatch: async (validFiles) => {
        console.info(
          "[ProductForm] Starting queue upload for",
          validFiles.length,
          "valid file(s)",
        );

        return runProductImageUploadBatch({
          files: validFiles,
          productId: initialData?.id,
          compressImage: async (file) => {
            console.info("[ProductForm] Uploading file:", {
              name: file.name,
              type: file.type,
              size: file.size,
            });

            const compressedFile = await compressImage(file);

            console.info("[ProductForm] Uploading compressed file:", {
              name: compressedFile.name,
              type: compressedFile.type,
              size: compressedFile.size,
            });

            return compressedFile;
          },
          uploadImage: executeProductImageUpload,
          onProgress: setUploadQueue,
          onFileFailure: ({ error, file, index }) => {
            console.error(`[ProductForm] Upload failed for ${file.name}:`, error);

            logError(error, {
              layer: "frontend",
              event: "inventory_image_upload_queue",
              fileName: file.name,
              fileIndex: index,
              userAgent: navigator.userAgent,
            });
          },
        });
      },
      summarizeOutcome: summarizeProductImageUploadOutcome,
      onToast: setToast,
      onProgress: setUploadQueue,
      onUploadedUrls: (urls) => {
        urls.forEach((url) => addImageEntry(url));
      },
      onComplete: () => {
        finalizeProductImageUploadUi(fileInputRef, setIsDragging);
      },
    });
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
    setCustomTags((current) => appendUniqueCustomTag(current, allTags, label));
  };

  const applyBrandOverride = (option: CatalogOption | null) => {
    applyBrandOverrideState(applyBrandOverrideOption(option), {
      setBrandOverrideId,
      setBrandOverrideInput,
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const applyModelOverride = (option: CatalogOption | null) => {
    applyModelOverrideState(applyModelOverrideOption(option), {
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const handleBrandOverrideChange = (value: string) => {
    applyBrandOverrideState(resolveBrandOverrideChange({ value, brandOptions }), {
      setBrandOverrideId,
      setBrandOverrideInput,
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const handleModelOverrideChange = (value: string) => {
    applyModelOverrideState(resolveModelOverrideChange({ value, modelOptions }), {
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const brandSuggestion = parseResult?.suggestions?.brand;
  const modelSuggestion = parseResult?.suggestions?.model;

  const applyBrandSuggestion = () => {
    const nextState = applyCatalogSuggestion(
      brandSuggestion?.id,
      brandOptions,
      applyBrandOverrideOption,
    );
    if (!nextState) {
      return;
    }

    applyBrandOverrideState(nextState, {
      setBrandOverrideId,
      setBrandOverrideInput,
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const applyModelSuggestion = () => {
    const nextState = applyCatalogSuggestion(
      modelSuggestion?.id,
      modelOptions,
      applyModelOverrideOption,
    );
    if (!nextState) {
      return;
    }

    applyModelOverrideState(nextState, {
      setModelOverrideId,
      setModelOverrideInput,
    });
  };

  const handleRemoveTag = (tag: TagChip) => {
    const nextState = removeTagSelection(tag, customTags, excludedAutoTagKeys);
    setCustomTags(nextState.customTags);
    setExcludedAutoTagKeys(nextState.excludedAutoTagKeys);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await submitProductForm({
      buildInput: () =>
        buildProductCreateInput({
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
        }),
      onSubmit,
      logError,
    });

    if (result.toast) {
      setToast(result.toast);
    }

    setIsLoading(false);
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
