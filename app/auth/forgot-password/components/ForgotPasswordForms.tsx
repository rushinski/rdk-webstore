// app/auth/forget-password/components/ForgotPasswordForms.tsx
"use client";

import { useState } from "react";
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const email = String(new FormData(form).get("email"));

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    setStatus(json.ok ? "Check your email for reset link." : json.error ?? "Reset failed");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && <p className="text-sm">{status}</p>}
      <input name="email" type="email" placeholder="Email" required className="border p-2 w-full" />
      <button type="submit" className="w-full border p-2">Send reset link</button>
    </form>
  );
}