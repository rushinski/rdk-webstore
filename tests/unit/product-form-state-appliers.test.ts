import {
  applyBrandOverrideState,
  applyModelOverrideState,
  finalizeProductImageUploadUi,
} from "@/components/inventory/product-form/stateAppliers";

describe("product form state appliers", () => {
  it("applies a brand override state across all related setters", () => {
    const setBrandOverrideId = jest.fn();
    const setBrandOverrideInput = jest.fn();
    const setModelOverrideId = jest.fn();
    const setModelOverrideInput = jest.fn();

    applyBrandOverrideState(
      {
        brandOverrideId: "brand-1",
        brandOverrideInput: "Nike",
        modelOverrideId: null,
        modelOverrideInput: "",
      },
      {
        setBrandOverrideId,
        setBrandOverrideInput,
        setModelOverrideId,
        setModelOverrideInput,
      },
    );

    expect(setBrandOverrideId).toHaveBeenCalledWith("brand-1");
    expect(setBrandOverrideInput).toHaveBeenCalledWith("Nike");
    expect(setModelOverrideId).toHaveBeenCalledWith(null);
    expect(setModelOverrideInput).toHaveBeenCalledWith("");
  });

  it("applies a model override state and finalizes upload ui", () => {
    const setModelOverrideId = jest.fn();
    const setModelOverrideInput = jest.fn();
    const setIsDragging = jest.fn();
    const fileInputRef = { current: { value: "filled" } };

    applyModelOverrideState(
      {
        modelOverrideId: "model-1",
        modelOverrideInput: "Air Max 1",
      },
      {
        setModelOverrideId,
        setModelOverrideInput,
      },
    );

    finalizeProductImageUploadUi(fileInputRef, setIsDragging);

    expect(setModelOverrideId).toHaveBeenCalledWith("model-1");
    expect(setModelOverrideInput).toHaveBeenCalledWith("Air Max 1");
    expect(fileInputRef.current?.value).toBe("");
    expect(setIsDragging).toHaveBeenCalledWith(false);
  });
});
