"use client";

type InventoryProductImageGalleryProps = {
  activeImage: string;
  images: Array<{ url: string | null | undefined }>;
  selectedImageIndex: number;
  title: string;
  onSelectImage: (index: number) => void;
};

export function InventoryProductImageGallery({
  activeImage,
  images,
  selectedImageIndex,
  title,
  onSelectImage,
}: InventoryProductImageGalleryProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[260px] items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
        <img src={activeImage} alt={title} className="h-full w-full object-contain p-2" />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image.url ?? "img"}-${index}`}
              type="button"
              onClick={() => onSelectImage(index)}
              className={`h-12 w-12 flex-shrink-0 overflow-hidden border ${
                selectedImageIndex === index
                  ? "border-brand-text bg-brand-page"
                  : "border-brand-border opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={image.url ?? ""}
                alt={`Image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
