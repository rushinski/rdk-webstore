"use client";

import { useEffect, useState } from "react";

export function useOrderItemDetailsModalState(params: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = params;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedImageIndex(0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return {
    selectedImageIndex,
    setSelectedImageIndex,
  };
}
