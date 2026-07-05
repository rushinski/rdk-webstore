import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";

import { isAdminRole } from "@/config/constants/roles";
import { SessionProvider } from "@/contexts/SessionContext";
import { getServerSession } from "@/lib/auth/session";
import { CartProvider } from "@/components/cart/CartProvider";
import { ClientShell } from "@/components/shell/ClientShell";
import { ScrollHeader } from "@/components/shell/ScrollHeader";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const rootLayoutMetadata: Metadata = {
  title: "solesneakers - Curated Footwear and Style",
  description: "Curated footwear and apparel with a clean editorial storefront.",
};

export const rootLayoutViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFEFEF" },
    { media: "(prefers-color-scheme: dark)", color: "#EFEFEF" },
  ],
};

export async function RootLayoutShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = Boolean(session);

  const role = session?.role ?? null;
  const isAdmin = role ? isAdminRole(role) : false;

  const userEmail = session?.user.email ?? session?.profile?.email;
  const userId = session?.user.id ?? null;

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
