// src/components/auth/2fa/QRDisplay.tsx
export function QRDisplay({
  qrCode,
  copyValue: _copyValue,
  onQrError,
}: {
  qrCode: string;
  copyValue?: string | null;
  onQrError?: () => void;
}) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex justify-center">
        <img
          src={qrCode}
          alt="2FA QR Code"
          className="h-48 w-48 bg-white p-3"
          onError={() => onQrError?.()}
        />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        Scan with Google Authenticator or any TOTP app
      </p>
    </div>
  );
}
