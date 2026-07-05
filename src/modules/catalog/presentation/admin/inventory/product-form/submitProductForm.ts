import type { LogEntry } from "@/lib/utils/log";
import type { ProductFormSubmitInput } from "../productEditorTypes";

interface SubmitProductFormArgs {
  buildInput: () => ProductFormSubmitInput;
  onSubmit: (data: ProductFormSubmitInput) => Promise<void>;
  logError: (error: unknown, entry?: Partial<LogEntry>) => void;
}

export async function submitProductForm({
  buildInput,
  onSubmit,
  logError,
}: SubmitProductFormArgs): Promise<{
  toast: { message: string; tone: "error" } | null;
}> {
  try {
    const data = buildInput();
    await onSubmit(data);
    return { toast: null };
  } catch (error) {
    logError(error, { layer: "frontend", event: "inventory_form_submit" });

    return {
      toast: {
        message: error instanceof Error ? error.message : "Failed to save product",
        tone: "error",
      },
    };
  }
}
