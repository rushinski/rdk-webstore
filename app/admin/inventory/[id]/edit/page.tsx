import { EditProductPageContent } from "@/modules/catalog/presentation/admin/inventory";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage(props: EditProductPageProps) {
  const params = await props.params;
  return <EditProductPageContent productId={params.id} />;
}
