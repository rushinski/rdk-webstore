import type { AdminOrderItemImage } from "@/components/admin/orders/OrderItemDetailsModal";

type OrderItemImageGalleryProps = {
  images: AdminOrderItemImage[];
  productTitle: string;
  selectedImageIndex: number;
  setSelectedImageIndex: (value: number) => void;
};

export function OrderItemImageGallery({
  images,
  productTitle,
  selectedImageIndex,
  setSelectedImageIndex,
}: OrderItemImageGalleryProps) {
  const selectedImage = images[selectedImageIndex]?.url || "/images/rdk-logo.png";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex w-full items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
        <img
          src={selectedImage}
          alt={productTitle}
          className="h-48 w-full object-contain p-2 md:h-[300px]"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`relative h-12 w-12 flex-shrink-0 overflow-hidden border transition-all ${
                selectedImageIndex === index
                  ? "border-brand-text bg-brand-page"
                  : "border-brand-border bg-brand-page opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={image.url || ""}
                className="h-full w-full object-cover"
                alt={`${productTitle} thumbnail ${index + 1}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
