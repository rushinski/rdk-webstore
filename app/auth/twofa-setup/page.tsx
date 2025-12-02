"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TwoFASetupPage() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function getSecret() {
    const res = await fetch("/api/auth/twofa/setup", { method: "POST" });
    const json = await res.json();
    setSecret(json.secret ?? null);
  }

  async function verifyCode() {
    const res = await fetch("/api/auth/twofa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    const json = await res.json();

    if (json.ok) {
      router.push("/protected/admin");
    } else {
      setMsg(json.error ?? "Invalid code");
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-4 text-center">Set up Admin 2FA</h1>

      {!secret && (
        <button onClick={getSecret} className="border p-2 w-full mb-4">
          Generate 2FA Secret
        </button>
      )}

      {secret && (
        <div className="space-y-4">
          <p className="text-sm">
            Add this secret into your authenticator app:
          </p>

          <p className="font-mono bg-gray-100 p-2 rounded">{secret}</p>

          <input
            className="border p-2 w-full"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {msg && <p className="text-red-500">{msg}</p>}

          <button onClick={verifyCode} className="border p-2 w-full">
            Verify Code
          </button>
        </div>
      )}
    </div>
  );
}
