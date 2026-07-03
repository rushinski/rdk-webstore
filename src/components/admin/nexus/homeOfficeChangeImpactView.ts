import type {
  HomeOfficeFormData,
  OldHomeOfficeAction,
} from "@/components/admin/nexus/homeOfficeSetupTypes";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";

const selectedButtonStyles = "border-brand-text bg-brand-text text-brand-page";
const unselectedButtonStyles =
  "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page";

export function getHomeOfficeChangeImpactSubtitle(oldHomeState: string) {
  return `What should we do with ${STATE_NAMES[oldHomeState]} (${oldHomeState})?`;
}

export function getHomeOfficeChangeImpactIntro(
  oldHomeState: string,
  formData: HomeOfficeFormData,
) {
  return `You're moving your home office from ${STATE_NAMES[oldHomeState]} to ${STATE_NAMES[formData.stateCode]}. Please specify your ongoing relationship with the old state.`;
}

export function getHomeOfficeActionButtonClassName(isSelected: boolean) {
  return [
    "flex-1 border px-4 py-3 text-sm transition-colors",
    isSelected ? selectedButtonStyles : unselectedButtonStyles,
  ].join(" ");
}

export function updateOldHomeOfficeAction<Field extends keyof OldHomeOfficeAction>(
  oldHomeAction: OldHomeOfficeAction,
  field: Field,
  value: OldHomeOfficeAction[Field],
): OldHomeOfficeAction {
  return {
    ...oldHomeAction,
    [field]: value,
  };
}
