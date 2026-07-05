import { submitProductForm } from "@/modules/catalog/presentation/admin/inventory/product-form/submitProductForm";
import type { ProductFormSubmitInput } from "@/modules/catalog/presentation/admin/inventory/productEditorTypes";

describe("submitProductForm", () => {
  it("builds the product input and submits it", async () => {
    const builtInput = { name: "Nike Air Max 1" } as ProductFormSubmitInput;
    const buildInput = jest.fn().mockReturnValue(builtInput);
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await expect(
      submitProductForm({
        buildInput,
        onSubmit,
        logError: jest.fn(),
      }),
    ).resolves.toEqual({ toast: null });

    expect(buildInput).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith(builtInput);
  });

  it("logs and returns a toast when submission fails", async () => {
    const error = new Error("Save failed");
    const logError = jest.fn();

    await expect(
      submitProductForm({
        buildInput: () => {
          throw error;
        },
        onSubmit: jest.fn(),
        logError,
      }),
    ).resolves.toEqual({
      toast: { message: "Save failed", tone: "error" },
    });

    expect(logError).toHaveBeenCalledWith(error, {
      layer: "frontend",
      event: "inventory_form_submit",
    });
  });

  it("uses a fallback toast message for unknown errors", async () => {
    await expect(
      submitProductForm({
        buildInput: () => {
          throw "bad";
        },
        onSubmit: jest.fn(),
        logError: jest.fn(),
      }),
    ).resolves.toEqual({
      toast: { message: "Failed to save product", tone: "error" },
    });
  });
});
