// app/auth/layout.tsx
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mt-16 min-h-screen bg-brand-page">{children}</div>;
}
