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
      <h1 className="text-2xl font-bold text-white mb-2">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-zinc-500">
          {description}
        </p>
      )}
    </div>
  );
}