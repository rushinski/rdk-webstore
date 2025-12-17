// src/components/auth/ui/AuthHeader.tsx
"use client";

import { authStyles } from "./authStyles";

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2 text-center">
      <div className={authStyles.badge}>Real Deal Kickz</div>
      <h1 className={authStyles.heading}>{title}</h1>
      {description ? <p className={authStyles.subheading}>{description}</p> : null}
    </div>
  );
}
