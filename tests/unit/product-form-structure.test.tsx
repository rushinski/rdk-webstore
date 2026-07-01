import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import { ProductForm } from "@/components/inventory/ProductForm";

describe("product form structure", () => {
  it("delegates major sections to focused product-form components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/inventory/ProductForm.tsx"),
      "utf8",
    );

    expect(source).toContain("./product-form/ProductFormDetailsSection");
    expect(source).toContain("./product-form/ProductFormVariantsSection");
    expect(source).toContain("./product-form/ProductFormMediaSection");
    expect(source).toContain("./product-form/buildProductCreateInput");
    expect(source).toContain("./product-form/validateProductImageFiles");
    expect(source).toContain("./product-form/summarizeProductImageUploadOutcome");
    expect(source).toContain("./product-form/executeProductImageUpload");
    expect(source).toContain("./product-form/runProductImageUploadBatch");
    expect(source).toContain("./product-form/tagHelpers");
    expect(source).toContain("./product-form/catalogOverrides");
    expect(source).toContain("./product-form/imageDrafts");
    expect(source).toContain("./product-form/catalogData");
    expect(source).toContain("./product-form/variantHelpers");
    expect(source).toContain("./product-form/catalogRequests");
    expect(source).toContain("./product-form/compressProductImageFile");
    expect(source).toContain("./product-form/submitProductForm");
    expect(source).toContain("./product-form/handleProductImageUpload");
    expect(source).toContain("./product-form/stateAppliers");
  });

  it("still renders core inventory form sections", () => {
    const html = renderToStaticMarkup(
      <ProductForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    expect(html).toContain("Basic Information");
    expect(html).toContain("Variants");
    expect(html).toContain("Images");
  });
});
