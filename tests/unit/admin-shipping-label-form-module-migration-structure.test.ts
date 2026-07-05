import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin shipping label form module migration structure", () => {
  it("makes the origin modal and create-label stack module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/shipping/OriginModal.tsx",
      "src/modules/orders/presentation/admin/shipping/OriginAddressFields.tsx",
      "src/modules/orders/presentation/admin/shipping/originModalFields.ts",
      "src/modules/orders/presentation/admin/shipping/CreateLabelForm.tsx",
      "src/modules/orders/presentation/admin/shipping/useCreateLabelFormState.ts",
      "src/modules/orders/presentation/admin/shipping/useCreateLabelFormMutations.ts",
      "src/modules/orders/presentation/admin/shipping/createLabelFormRequests.ts",
      "src/modules/orders/presentation/admin/shipping/createLabelFormView.ts",
      "src/modules/orders/presentation/admin/shipping/createLabelFormTypes.ts",
      "src/modules/orders/presentation/admin/shipping/CreateLabelRecipientPanel.tsx",
      "src/modules/orders/presentation/admin/shipping/CreateLabelRatesPanel.tsx",
      "src/modules/orders/presentation/admin/shipping/CreateLabelAddressFields.tsx",
      "src/modules/orders/presentation/admin/shipping/CreateLabelPackageFields.tsx",
      "src/modules/orders/presentation/admin/shipping/CreateLabelRateRequestPanel.tsx",
      "src/modules/orders/presentation/admin/shipping/CreateLabelOriginSummary.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy origin modal and create-label duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/shipping/OriginModal.tsx",
      "src/components/admin/shipping/OriginAddressFields.tsx",
      "src/components/admin/shipping/originModalFields.ts",
      "src/components/admin/shipping/CreateLabelForm.tsx",
      "src/components/admin/shipping/useCreateLabelFormState.ts",
      "src/components/admin/shipping/useCreateLabelFormMutations.ts",
      "src/components/admin/shipping/createLabelFormRequests.ts",
      "src/components/admin/shipping/createLabelFormView.ts",
      "src/components/admin/shipping/createLabelFormTypes.ts",
      "src/components/admin/shipping/CreateLabelRecipientPanel.tsx",
      "src/components/admin/shipping/CreateLabelRatesPanel.tsx",
      "src/components/admin/shipping/CreateLabelAddressFields.tsx",
      "src/components/admin/shipping/CreateLabelPackageFields.tsx",
      "src/components/admin/shipping/CreateLabelRateRequestPanel.tsx",
      "src/components/admin/shipping/CreateLabelOriginSummary.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
