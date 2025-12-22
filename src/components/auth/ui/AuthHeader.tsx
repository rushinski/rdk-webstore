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
    <div className="space-y-2 mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-zinc-400 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}