import type { Metadata } from "next";

import { getCachedStoreProduct } from "@/modules/storefront/infrastructure/storefront-data";

export function isStoreProductId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function buildStoreProductMetadata(productId: string): Promise<Metadata> {
  if (!isStoreProductId(productId)) {
    return { title: "Product Not Found" };
  }

  const product = await getCachedStoreProduct(productId);
  if (!product) {
    return { title: "Product Not Found" };
  }

  const primaryImage = product.images.find((img) => img.is_primary) || product.images[0];
  const imageUrl = primaryImage?.url || "/placeholder.png";
  const firstVariant = product.variants[0];
  const title = product.name;
  const fullTitle = `${title} | solesneakers`;
  const conditionText = product.condition === "new" ? "Brand New" : "Pre-Owned";
  const description = product.description
    ? `${conditionText} - ${product.description.slice(0, 150)}${product.description.length > 150 ? "..." : ""}`
    : `${conditionText} ${title}. Curated footwear and style.`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: title,
        },
      ],
      type: "website",
      siteName: "solesneakers",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    other: {
      "product:price:amount": firstVariant
        ? (firstVariant.sale_price_cents / 100).toString()
        : "",
      "product:price:currency": "USD",
      "product:condition": product.condition,
      "product:availability":
        firstVariant && firstVariant.stock > 0 ? "in stock" : "out of stock",
    },
  };
}
