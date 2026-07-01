import type { Category, Condition } from "@/types/domain/product";
import { RdkSelect } from "@/components/ui/Select";

import { TagInput, type TagChip } from "../TagInput";

import type { CatalogOption, ParseStatus, PublishMode } from "./types";

type ProductFormDetailsSectionProps = {
  titleRaw: string;
  category: Category;
  condition: Condition;
  parseStatus: ParseStatus;
  parsedBrandLabel: string;
  parsedModelLabel: string;
  parsedName: string;
  parsedTitleDisplay: string | null;
  brandSuggestionLabel: string | null;
  modelSuggestionLabel: string | null;
  brandOverrideInput: string;
  brandOverrideId: string | null;
  brandOptions: CatalogOption[];
  modelOverrideInput: string;
  modelOverrideId: string | null;
  modelOptions: CatalogOption[];
  effectiveBrandId: string | null;
  description: string;
  shippingPrice: string;
  shippingDefaultsStatus: "loading" | "ready" | "error";
  defaultShippingPrice: number;
  tags: TagChip[];
  publishMode: PublishMode;
  scheduledGoLiveAt: string;
  scheduleMin: string;
  isLoading: boolean;
  isEditing: boolean;
  onTitleRawChange: (value: string) => void;
  onCategoryChange: (value: Category) => void;
  onConditionChange: (value: Condition) => void;
  onApplyBrandSuggestion: () => void;
  onApplyModelSuggestion: () => void;
  onBrandOverrideChange: (value: string) => void;
  onClearBrandOverride: () => void;
  onModelOverrideChange: (value: string) => void;
  onClearModelOverride: () => void;
  onDescriptionChange: (value: string) => void;
  onShippingPriceChange: (value: string) => void;
  onAddTag: (label: string) => void;
  onRemoveTag: (tag: TagChip) => void;
  onPublishModeChange: (mode: PublishMode) => void;
  onEnsureScheduledTime: () => void;
  onScheduledGoLiveAtChange: (value: string) => void;
  onCancel: () => void;
};

export function ProductFormDetailsSection({
  titleRaw,
  category,
  condition,
  parseStatus,
  parsedBrandLabel,
  parsedModelLabel,
  parsedName,
  parsedTitleDisplay,
  brandSuggestionLabel,
  modelSuggestionLabel,
  brandOverrideInput,
  brandOverrideId,
  brandOptions,
  modelOverrideInput,
  modelOverrideId,
  modelOptions,
  effectiveBrandId,
  description,
  shippingPrice,
  shippingDefaultsStatus,
  defaultShippingPrice,
  tags,
  publishMode,
  scheduledGoLiveAt,
  scheduleMin,
  isLoading,
  isEditing,
  onTitleRawChange,
  onCategoryChange,
  onConditionChange,
  onApplyBrandSuggestion,
  onApplyModelSuggestion,
  onBrandOverrideChange,
  onClearBrandOverride,
  onModelOverrideChange,
  onClearModelOverride,
  onDescriptionChange,
  onShippingPriceChange,
  onAddTag,
  onRemoveTag,
  onPublishModeChange,
  onEnsureScheduledTime,
  onScheduledGoLiveAtChange,
  onCancel,
}: ProductFormDetailsSectionProps) {
  return (
    <>
      <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
        <h2 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-xl">
          Basic Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Full Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titleRaw}
              onChange={(event) => onTitleRawChange(event.target.value)}
              required
              className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-4 md:text-base"
            />
            <p className="mt-2 text-xs text-gray-500">
              One input only. We parse brand, model (sneakers), and name automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Category <span className="text-red-500">*</span>
              </label>
              <RdkSelect
                value={category}
                onChange={(value) => onCategoryChange(value as Category)}
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
              <label className="mb-1 block text-sm text-gray-400">
                Condition <span className="text-red-500">*</span>
              </label>
              <RdkSelect
                value={condition}
                onChange={(value) => onConditionChange(value as Condition)}
                options={[
                  { value: "new", label: "New" },
                  { value: "used", label: "Pre-owned" },
                ]}
                buttonClassName="bg-zinc-800"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded border border-zinc-800/70 bg-zinc-950/40 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Parsed Preview</h3>
            {parseStatus === "loading" && (
              <span className="text-xs text-gray-500">Parsing...</span>
            )}
            {parseStatus === "error" && (
              <span className="text-xs text-red-400">Unable to parse title</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 md:gap-3">
            <div className="text-gray-400">
              <span className="block text-xs uppercase text-gray-500">Brand</span>
              <span className="text-white">{parsedBrandLabel || "-"}</span>
            </div>
            {category === "sneakers" && (
              <div className="text-gray-400">
                <span className="block text-xs uppercase text-gray-500">Model</span>
                <span className="text-white">{parsedModelLabel || "-"}</span>
              </div>
            )}
            <div className="text-gray-400">
              <span className="block text-xs uppercase text-gray-500">Name</span>
              <span className="text-white">{parsedName || "-"}</span>
            </div>
          </div>

          {parsedTitleDisplay && (
            <div className="text-xs text-gray-500">
              Display: <span className="text-gray-200">{parsedTitleDisplay}</span>
            </div>
          )}

          {(brandSuggestionLabel || modelSuggestionLabel) && (
            <div className="flex flex-wrap gap-2">
              {brandSuggestionLabel && (
                <button
                  type="button"
                  onClick={onApplyBrandSuggestion}
                  className="rounded-full border border-zinc-700/70 px-3 py-1 text-xs text-red-200 hover:bg-red-900/30"
                >
                  Did you mean {brandSuggestionLabel}?
                </button>
              )}
              {category === "sneakers" && modelSuggestionLabel && (
                <button
                  type="button"
                  onClick={onApplyModelSuggestion}
                  className="rounded-full border border-zinc-700/70 px-3 py-1 text-xs text-red-200 hover:bg-red-900/30"
                >
                  Did you mean {modelSuggestionLabel}?
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Override Brand</label>
            <input
              type="text"
              list="brand-options"
              value={brandOverrideInput}
              onChange={(event) => onBrandOverrideChange(event.target.value)}
              placeholder="Search brands..."
              className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-700/40 md:px-4 md:text-base"
            />
            <datalist id="brand-options">
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.label} />
              ))}
            </datalist>
            {brandOverrideId && (
              <button
                type="button"
                onClick={onClearBrandOverride}
                className="mt-2 text-xs text-gray-500 hover:text-white"
              >
                Clear override
              </button>
            )}
          </div>

          {category === "sneakers" && (
            <div>
              <label className="mb-1 block text-sm text-gray-400">Override Model</label>
              <input
                type="text"
                list="model-options"
                value={modelOverrideInput}
                onChange={(event) => onModelOverrideChange(event.target.value)}
                placeholder={
                  effectiveBrandId ? "Search models..." : "Select a brand first"
                }
                disabled={!effectiveBrandId}
                className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-700/40 disabled:text-gray-500 md:px-4 md:text-base"
              />
              <datalist id="model-options">
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.label} />
                ))}
              </datalist>
              {modelOverrideId && (
                <button
                  type="button"
                  onClick={onClearModelOverride}
                  className="mt-2 text-xs text-gray-500 hover:text-white"
                >
                  Clear override
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-gray-400">Description</label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-4 md:text-base"
          />
        </div>
      </div>

      <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
        <h2 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-xl">
          Pricing & Shipping
        </h2>

        <div>
          <label className="mb-1 block text-sm text-gray-400">Shipping Price ($)</label>
          <input
            type="text"
            inputMode="decimal"
            value={shippingPrice}
            onChange={(event) => onShippingPriceChange(event.target.value)}
            className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-4 md:text-base"
          />

          {shippingDefaultsStatus === "loading" ? (
            <p className="mt-1 text-xs text-gray-500">
              Loading default shipping prices...
            </p>
          ) : shippingDefaultsStatus === "error" ? (
            <p className="mt-1 text-xs text-red-400">
              Could not load defaults. You can still set an override.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to use {category} default:{" "}
              <span className="text-gray-200">${defaultShippingPrice.toFixed(2)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
        <h2 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-xl">Tags</h2>
        <TagInput tags={tags} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
      </div>

      <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
        <h2 className="mb-2 text-lg font-semibold text-white md:text-xl">
          Posting Schedule
        </h2>
        <p className="text-xs text-gray-400 md:text-sm">
          Products post immediately by default. Switch to scheduled posting to pick a
          future go-live date and time.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer select-none items-center gap-3 text-sm text-white">
            <input
              type="radio"
              name="publish-mode"
              checked={publishMode === "immediately"}
              onChange={() => onPublishModeChange("immediately")}
              className="h-4 w-4 cursor-pointer accent-red-600"
            />
            <span>Post immediately</span>
          </label>
          <label className="flex cursor-pointer select-none items-center gap-3 text-sm text-white">
            <input
              type="radio"
              name="publish-mode"
              checked={publishMode === "scheduled"}
              onChange={() => {
                onPublishModeChange("scheduled");
                onEnsureScheduledTime();
              }}
              className="h-4 w-4 cursor-pointer accent-red-600"
            />
            <span>Schedule date and time</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-gray-400">
            Go Live Date & Time
            {publishMode === "scheduled" && (
              <>
                {" "}
                <span className="text-red-500">*</span>
              </>
            )}
          </label>
          <input
            type="datetime-local"
            value={scheduledGoLiveAt}
            min={scheduleMin}
            disabled={publishMode !== "scheduled"}
            onChange={(event) => onScheduledGoLiveAtChange(event.target.value)}
            className="w-full rounded border border-zinc-800/70 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:px-4 md:text-base"
          />
          <p className="mt-2 text-xs text-gray-500">
            {publishMode === "scheduled"
              ? "This uses your local timezone and converts to UTC when saved."
              : "Posting immediately. Choose 'Schedule date and time' to enable this field."}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-zinc-800 bg-black p-4 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 md:gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-600 md:text-base"
        >
          {isLoading ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-600 md:text-base"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
