// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { ScrollHeader } from "@/components/shell/ScrollHeader";
import { ClientShell } from "@/components/shell/ClientShell";
import { getServerSession } from "@/lib/auth/session";
import { isAdminRole } from "@/config/constants/roles";
import "@/styles/global.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Realdealkickzsc - Premium Sneakers & Streetwear",
  description: "Authentic sneakers and streetwear. Quality guaranteed.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = Boolean(session);

  const role = session?.role ?? null;
  const isAdmin = role ? isAdminRole(role) : false;

  const userEmail = session?.user.email ?? session?.profile?.email;

  return (
    <html lang="en">
      <body className="bg-black text-white">
        <CartProvider>
          <ClientShell isAdmin={isAdmin} userEmail={userEmail} role={role}>
            <ScrollHeader
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              role={role}
            />
            <main className="min-h-screen pt-16 pb-20 md:pb-0">{children}</main>
          </ClientShell>
        </CartProvider>
      </body>
    </html>
  );
}
