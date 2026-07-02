"use client";

import { AlertCircle } from "lucide-react";

export function ShippingReadyAlert() {
  return (
    <div className="border border-amber-200 bg-amber-50 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 sm:h-5 sm:w-5" />
        <div className="text-[12px] text-amber-700 sm:text-sm">
          <strong>Automatic tracking:</strong> Once you ship packages, Shippo will
          automatically update tracking status and send customer emails. The "Mark
          shipped" button should only be used if the carrier hasn't scanned the package
          yet.
        </div>
      </div>
    </div>
  );
}
