// app/auth/components/auth-forms.tsx
"use client";

import { useState } from "react";
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const email = String(new FormData(form).get("email"));

    const res = await fetch("/api/auth/password/forgot", {
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

export function UpdatePasswordForm() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget as HTMLFormElement).get("password"));

    const res = await fetch("/api/auth/password/update", {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    const json = await res.json();
    setStatus(json.ok ? "Password updated. You are now logged in." : json.error ?? "Update failed");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && <p className="text-sm">{status}</p>}
      <input
        name="password"
        type="password"
        placeholder="New password"
        required
        className="border p-2 w-full"
      />
      <button type="submit" className="w-full border p-2">Update password</button>
    </form>
  );
}
