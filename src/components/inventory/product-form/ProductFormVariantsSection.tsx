import type { CSSProperties, ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { SizeType } from "@/types/domain/product";
import { RdkSelect } from "@/components/ui/Select";

import type { VariantDraft } from "./types";

type SortableVariantRenderProps = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging" | "isOver"
>;

type SortableVariantRowProps = {
  id: string;
  className: string;
  children: (props: SortableVariantRenderProps) => ReactNode;
};

type ProductFormVariantsSectionProps = {
  variants: VariantDraft[];
  variantIds: string[];
  sizeType: SizeType;
  variantDragSensors: SensorDescriptor<SensorOptions>[];
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
  onUpdateVariant: (index: number, field: keyof VariantDraft, value: string) => void;
  onHandleVariantDragEnd: (event: DragEndEvent) => void;
  buildSizeOptions: (
    sizes: readonly string[],
    selectedValue: string,
  ) => { value: string; label: string }[];
};

function SortableVariantRow({ id, className, children }: SortableVariantRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 220ms cubic-bezier(0.2, 0, 0, 1)",
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners, setActivatorNodeRef, isDragging, isOver })}
    </div>
  );
}

export function ProductFormVariantsSection({
  variants,
  variantIds,
  sizeType,
  variantDragSensors,
  onAddVariant,
  onRemoveVariant,
  onUpdateVariant,
  onHandleVariantDragEnd,
  buildSizeOptions,
}: ProductFormVariantsSectionProps) {
  return (
    <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <h2 className="text-lg font-semibold text-white md:text-xl">Variants</h2>
        <button
          type="button"
          onClick={onAddVariant}
          className="flex items-center gap-1 rounded bg-red-600 px-2 py-1.5 text-xs text-white transition hover:bg-red-700 md:gap-2 md:px-3 md:py-2 md:text-sm"
        >
          <Plus className="h-3 w-3 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Add Variant</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
      <DndContext
        sensors={variantDragSensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onHandleVariantDragEnd}
      >
        <SortableContext items={variantIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 md:space-y-4">
            {variants.map((variant, index) => (
              <SortableVariantRow
                key={variant.draft_id}
                id={variant.draft_id}
                className="transition-transform duration-200"
              >
                {({ attributes, listeners, setActivatorNodeRef, isDragging, isOver }) => (
                  <div
                    className={[
                      "relative flex flex-col gap-3 rounded bg-zinc-800 p-3 transition-[box-shadow,opacity] duration-150 md:flex-row md:flex-wrap md:items-end md:gap-4 md:p-4",
                      isDragging ? "opacity-65 shadow-2xl" : "",
                      isOver ? "ring-2 ring-red-500/50" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
                      <div className="w-full md:w-32">
                        <label className="mb-1 block text-xs text-gray-400">SKU</label>
                        <input
                          type="text"
                          value={variant.sku}
                          readOnly
                          aria-readonly="true"
                          tabIndex={-1}
                          title="SKU is generated automatically and cannot be edited"
                          className="w-full cursor-not-allowed select-none rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 font-mono text-xs text-zinc-400 focus:outline-none focus:ring-0 md:px-3 md:text-sm"
                        />
                      </div>

                      <div className="w-full md:w-40">
                        <label className="mb-1 block text-xs text-gray-400">
                          Size <span className="text-red-500">*</span>
                        </label>

                        {sizeType === "shoe" && (
                          <RdkSelect
                            value={variant.size_label}
                            onChange={(value) =>
                              onUpdateVariant(index, "size_label", value)
                            }
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
                            onChange={(value) =>
                              onUpdateVariant(index, "size_label", value)
                            }
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
                            onChange={(event) =>
                              onUpdateVariant(index, "size_label", event.target.value)
                            }
                            required
                            placeholder="e.g., One Size"
                            className="w-full rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-3 md:text-sm"
                          />
                        )}

                        {sizeType === "none" && (
                          <input
                            type="text"
                            value="N/A"
                            disabled
                            className="w-full rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 text-xs text-gray-500 md:px-3 md:text-sm"
                          />
                        )}
                      </div>

                      <div className="w-full md:w-32">
                        <label className="mb-1 block text-xs text-gray-400">
                          Sale Price ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={variant.salePrice}
                          onChange={(event) =>
                            onUpdateVariant(index, "salePrice", event.target.value)
                          }
                          required
                          className="w-full rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-3 md:text-sm"
                        />
                      </div>

                      <div className="w-full md:w-32">
                        <label className="mb-1 block text-xs text-gray-400">
                          Unit Cost ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={variant.unitCost}
                          onChange={(event) =>
                            onUpdateVariant(index, "unitCost", event.target.value)
                          }
                          required
                          className="w-full rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-3 md:text-sm"
                        />
                      </div>

                      <div className="w-full md:w-24">
                        <label className="mb-1 block text-xs text-gray-400">
                          Stock <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={variant.stock}
                          onChange={(event) =>
                            onUpdateVariant(index, "stock", event.target.value)
                          }
                          required
                          className="w-full rounded border border-zinc-800/70 bg-zinc-900 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-600 md:px-3 md:text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 self-end md:h-[42px]">
                      <button
                        ref={setActivatorNodeRef}
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none rounded p-2 text-zinc-300 hover:bg-zinc-900 hover:text-white active:cursor-grabbing"
                        aria-label="Drag to reorder variant"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveVariant(index)}
                          className="rounded p-2 text-red-500 hover:bg-zinc-900 hover:text-red-400"
                          aria-label="Remove variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </SortableVariantRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
