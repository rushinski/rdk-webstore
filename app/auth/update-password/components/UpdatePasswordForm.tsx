// app/auth/update-password/components/UpdatePasswordForm.tsx
"use client";

import { useState } from "react";

export function UpdatePasswordForm() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget as HTMLFormElement).get("password"));

    const res = await fetch("/api/auth/update-password", {
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