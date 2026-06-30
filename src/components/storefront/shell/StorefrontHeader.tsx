import Image from "next/image";

import type { ProfileRole } from "@/config/constants/roles";

import { StorefrontHeaderClient } from "./StorefrontHeaderClient";

export function StorefrontHeader({
  isAuthenticated,
  userEmail,
  role,
  cartCount,
}: {
  isAuthenticated: boolean;
  userEmail?: string | null;
  role?: ProfileRole | null;
  cartCount: number;
}) {
  return (
    <div className="mx-auto flex h-16 w-full max-w-brand items-center px-6 md:px-12 lg:px-16">
      <StorefrontHeaderClient
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        role={role}
        cartCount={cartCount}
      >
        <Image
          src="/images/logo.svg"
          alt="solesneakers"
          width={176}
          height={40}
          priority
          className="h-10 w-auto object-contain"
        />
      </StorefrontHeaderClient>
    </div>
  );
}
