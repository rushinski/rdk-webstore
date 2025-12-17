// src/components/auth/ui/AuthHeader.tsx
"use client";

import { AuthStyles } from "./AuthStyles";

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2 text-center">
      <div className={AuthStyles.badge}>Real Deal Kickz</div>
      <h1 className={AuthStyles.heading}>{title}</h1>
      {description ? <p className={AuthStyles.subheading}>{description}</p> : null}
    </div>
  );
}
