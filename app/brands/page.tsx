import { BrandsPageContent } from "@/modules/storefront";

export const revalidate = 300;

export default async function BrandsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  return <BrandsPageContent searchParams={searchParams} />;
}
