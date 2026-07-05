import type { BrandOverrideState, ModelOverrideState } from "./catalogOverrides";

export function applyBrandOverrideState(
  state: BrandOverrideState,
  setters: {
    setBrandOverrideId: (value: string | null) => void;
    setBrandOverrideInput: (value: string) => void;
    setModelOverrideId: (value: string | null) => void;
    setModelOverrideInput: (value: string) => void;
  },
) {
  setters.setBrandOverrideId(state.brandOverrideId);
  setters.setBrandOverrideInput(state.brandOverrideInput);
  setters.setModelOverrideId(state.modelOverrideId);
  setters.setModelOverrideInput(state.modelOverrideInput);
}

export function applyModelOverrideState(
  state: ModelOverrideState,
  setters: {
    setModelOverrideId: (value: string | null) => void;
    setModelOverrideInput: (value: string) => void;
  },
) {
  setters.setModelOverrideId(state.modelOverrideId);
  setters.setModelOverrideInput(state.modelOverrideInput);
}

export function finalizeProductImageUploadUi(
  fileInputRef: { current: { value: string } | null },
  setIsDragging: (value: boolean) => void,
) {
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
  setIsDragging(false);
}
