// src/components/auth/2fa/QRDisplay.tsx
export function QRDisplay({ qrCode }: { qrCode: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCode}
          alt="2FA QR Code"
          className="h-48 w-48 rounded-lg bg-white p-3"
        />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        Scan with Google Authenticator, Authy, or any TOTP app.
      </p>
    </div>
  );
}