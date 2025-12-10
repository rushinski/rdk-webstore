// app/auth/components/mfa/EnrollmentForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRDisplay } from "./QRDisplay";
import { mfaEnroll, mfaVerifyEnrollment } from "@/services/mfa-service";

export function EnrollmentForm() {
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function startEnroll() {
    const res = await mfaEnroll();
    if (res.error) return setMsg(res.error);

    setFactorId(res.factorId);
    setQrCode(res.qrCode);
  }

  async function verify() {
    if (!factorId) return setMsg("Missing factor ID.");

    const res = await mfaVerifyEnrollment(factorId, code);
    if (res.error) return setMsg(res.error);

    router.push("/admin");
  }

  return (
    <div>
      {!factorId && <button onClick={startEnroll}>Generate QR Code</button>}

      {factorId && qrCode && (
        <>
          <QRDisplay qrCode={qrCode} />

          <input
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {msg && <p>{msg}</p>}

          <button onClick={verify}>Verify Code</button>
        </>
      )}
    </div>
  );
}
