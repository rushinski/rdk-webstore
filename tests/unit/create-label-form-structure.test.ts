import fs from "node:fs";
import path from "node:path";

describe("create label form structure", () => {
  it("delegates rate lookup and label purchase workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/CreateLabelForm.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/useCreateLabelFormMutations");
    expect(source).toContain("useCreateLabelFormMutations({");
  });

  it("delegates create-label helper and display logic to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/CreateLabelForm.tsx"),
      "utf8",
    );
    const ratesPanelSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/CreateLabelRatesPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/createLabelFormView");
    expect(source).toContain("buildInitialRecipient(");
    expect(ratesPanelSource).toContain("formatDeliveryEstimate(");
  });

  it("delegates create-label form state and input handlers to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/CreateLabelForm.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/useCreateLabelFormState");
    expect(source).toContain("useCreateLabelFormState({");
  });

  it("delegates the recipient editor and rates panel to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/CreateLabelForm.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/CreateLabelRecipientPanel");
    expect(source).toContain("@/components/admin/shipping/CreateLabelRatesPanel");
    expect(source).toContain("<CreateLabelRecipientPanel");
    expect(source).toContain("<CreateLabelRatesPanel");
  });
});
