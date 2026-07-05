import { StoreCatalogPageContent } from "@/modules/storefront";

export const revalidate = 60;

export default async function StorePage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <StoreCatalogPageContent searchParams={resolvedSearchParams} />;
}
