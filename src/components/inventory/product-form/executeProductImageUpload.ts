import { parseProductImageUploadResponse } from "./parseProductImageUploadResponse";

interface UploadResponseLike {
  ok: boolean;
  text(): Promise<string>;
}

interface ExecuteProductImageUploadArgs {
  file: File;
  originalFileName: string;
  productId?: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<UploadResponseLike>;
}

export async function executeProductImageUpload({
  file,
  originalFileName,
  productId,
  fetchImpl = fetch,
}: ExecuteProductImageUploadArgs): Promise<string[]> {
  const formData = new FormData();
  formData.append("file", file, originalFileName);

  if (productId) {
    formData.append("productId", productId);
  }

  const response = await fetchImpl("/api/admin/uploads/product-image", {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();

  return parseProductImageUploadResponse({
    ok: response.ok,
    responseText,
  });
}
