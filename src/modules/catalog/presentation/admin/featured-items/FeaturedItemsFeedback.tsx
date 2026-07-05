"use client";

import { Toast } from "@/components/ui/Toast";
import type { FeaturedItemsToastState } from "@/modules/catalog/presentation/admin/featured-items/featuredItemsTypes";

type FeaturedItemsFeedbackProps = {
  onCloseToast: () => void;
  toast: FeaturedItemsToastState;
};

export function FeaturedItemsFeedback({
  onCloseToast,
  toast,
}: FeaturedItemsFeedbackProps) {
  return (
    <Toast
      open={Boolean(toast)}
      message={toast?.message ?? ""}
      tone={toast?.tone ?? "info"}
      onClose={onCloseToast}
    />
  );
}
