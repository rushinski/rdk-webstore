"use client";

import type { FeaturedItemsToastState } from "@/components/admin/featured-items/featuredItemsTypes";
import { Toast } from "@/components/ui/Toast";

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
