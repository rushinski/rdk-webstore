// app/auth/components/mfa/QRDisplay.tsx
export function QRDisplay({ qrCode }: { qrCode: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCode}
          alt="2FA QR Code"
          className="h-48 w-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white p-2"
        />
      </div>

      <p className="mt-3 text-center text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
        If the QR code won’t scan, regenerate and try again.
      </p>
    </div>
  );
}
