// src/components/auth/ui/AuthHeader.tsx
"use client";

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="mb-2 text-2xl font-bold uppercase tracking-[0.08em] text-brand-text">
        {title}
      </h1>
      {description && <p className="text-sm text-brand-muted">{description}</p>}
    </div>
  );
}
