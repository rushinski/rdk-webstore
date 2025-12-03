// app/auth/components/mfa/QRDisplay.tsx
export function QRDisplay({ qrCode }: { qrCode: string }) {
  return (
    <div className="flex justify-center">
      <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
    </div>
  );
}
