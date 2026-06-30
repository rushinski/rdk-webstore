// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";

import { CartProvider } from "@/components/cart/CartProvider";
import { ScrollHeader } from "@/components/shell/ScrollHeader";
import { ClientShell } from "@/components/shell/ClientShell";
import { SessionProvider } from "@/contexts/SessionContext";
import { getServerSession } from "@/lib/auth/session";
import { isAdminRole } from "@/config/constants/roles";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "solesneakers - Curated Footwear and Style",
  description: "Curated footwear and apparel with a clean editorial storefront.",
};

// OPTIMIZATION: Proper viewport configuration for mobile performance
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover", // Safe area insets on iOS
  // Theme color for mobile browsers
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFEFEF" },
    { media: "(prefers-color-scheme: dark)", color: "#EFEFEF" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = Boolean(session);

  const role = session?.role ?? null;
  const isAdmin = role ? isAdminRole(role) : false;

  const userEmail = session?.user.email ?? session?.profile?.email;
  const userId = session?.user.id ?? null;

  // OPTIMIZATION: Prepare session for client-side context
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
      }
    : null;

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-brand-page text-brand-text">
        <SessionProvider initialUser={sessionUser} initialRole={role}>
          <CartProvider userId={userId}>
            <ClientShell isAdmin={isAdmin} userEmail={userEmail} role={role}>
              <ScrollHeader
                isAuthenticated={isAuthenticated}
                userEmail={userEmail}
                role={role}
              />
              <main className="min-h-screen pt-16 pb-20 md:pb-0">{children}</main>
            </ClientShell>
          </CartProvider>
        </SessionProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
