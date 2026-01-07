// src/components/auth/2fa/QRDisplay.tsx
import { useEffect, useRef, useState } from "react";

export function QRDisplay({ qrCode, copyValue }: { qrCode: string; copyValue?: string | null }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => {
        setCopyStatus("idle");
      }, 2000);
    }
  };

  const copyLabel =
    copyStatus === "copied"
      ? "Copied"
      : copyStatus === "error"
        ? "Copy failed"
        : "Copy setup info";

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 bg-white p-3" />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        Scan with Google Authenticator or any TOTP app
      </p>
    </div>
  );
}
