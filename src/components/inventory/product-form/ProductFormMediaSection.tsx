import type { DragEvent, RefObject } from "react";
import { ImagePlus, X } from "lucide-react";

import type { ImageDraft, UploadQueueState } from "./types";

type ProductFormMediaSectionProps = {
  images: ImageDraft[];
  uploadQueue: UploadQueueState;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onSetPrimaryImage: (index: number) => void;
  onRemoveImage: (index: number) => void;
};

export function ProductFormMediaSection({
  images,
  uploadQueue,
  isDragging,
  fileInputRef,
  onUploadFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onSetPrimaryImage,
  onRemoveImage,
}: ProductFormMediaSectionProps) {
  return (
    <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <h2 className="text-lg font-semibold text-white md:text-xl">
          Images <span className="text-red-500">*</span>
        </h2>
        <span className="text-xs text-gray-500">{images.length} total</span>
      </div>

      {uploadQueue.isUploading && (
        <div className="mb-4 rounded border border-blue-800/50 bg-blue-900/20 p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-200 md:text-sm">
              {uploadQueue.currentStatus || "Uploading images..."}
            </span>
            <span className="text-xs text-blue-300">
              {uploadQueue.completed} / {uploadQueue.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${(uploadQueue.completed / uploadQueue.total) * 100}%`,
              }}
            />
          </div>
          {uploadQueue.failed > 0 && (
            <p className="mt-2 text-xs text-red-400">
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
        onChange={(event) => {
          void onUploadFiles(event.target.files);
        }}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "flex h-32 w-full cursor-pointer flex-col items-center gap-2 rounded border border-dashed px-3 py-3 transition sm:flex-row md:h-44 md:gap-3 md:px-4",
          isDragging
            ? "border-red-500 bg-red-900/10"
            : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-950/50",
        ].join(" ")}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-800/70 bg-zinc-900 md:h-10 md:w-10">
          <ImagePlus className="h-4 w-4 text-gray-400 md:h-5 md:w-5" />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold text-white md:text-sm">Tap to add images</p>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP. Max 10MB each.</p>
        </div>
      </div>

      <div className="mt-3 md:mt-4">
        {images.length === 0 ? (
          <div className="text-xs text-gray-500 md:text-sm">No images yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3">
            {images.map((image, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => onSetPrimaryImage(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSetPrimaryImage(index);
                  }
                }}
                className={[
                  "group relative cursor-pointer select-none overflow-hidden rounded border text-left transition",
                  image.is_primary
                    ? "border-red-500"
                    : "border-zinc-800/70 hover:border-zinc-700",
                ].join(" ")}
                title="Tap to set primary"
              >
                <div className="aspect-square overflow-hidden bg-zinc-900">
                  {image.url ? (
                    <img
                      src={image.url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                      Missing
                    </div>
                  )}
                </div>

                <div className="absolute left-1 top-1">
                  <span
                    className={[
                      "rounded border px-1.5 py-0.5 text-[9px] md:px-2 md:text-[10px]",
                      image.is_primary
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-white/10 bg-black/50 text-gray-200",
                    ].join(" ")}
                  >
                    {image.is_primary ? "Primary" : "Thumb"}
                  </span>
                </div>

                <div className="absolute right-1 top-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveImage(index);
                    }}
                    className="rounded bg-black/60 p-1 text-white hover:bg-black/80 md:p-1.5"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500 md:mt-3">
        Images are optional. Tap any thumbnail to set as primary.
      </div>
    </div>
  );
}
