import Image from "next/image";

import { brandTheme } from "@/config/brand/solesneakers";

export function AdminBrandHeader() {
  return (
    <div className="border-b border-brand-border px-6 py-6">
      <Image
        src={brandTheme.logo.src}
        alt={brandTheme.logo.alt}
        width={176}
        height={40}
        className="h-10 w-auto object-contain"
        priority
      />
    </div>
  );
}
