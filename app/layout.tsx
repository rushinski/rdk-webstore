// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/components/cart/CartProvider';
import { ScrollHeader } from '@/components/shell/ScrollHeader';
import { ClientShell } from '@/components/shell/ClientShell';
import { getServerSession } from '@/lib/auth/session';
import { isAdminRole } from '@/repositories/profile-repo';
import '@/styles/global.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Realdealkickzsc - Premium Sneakers & Streetwear',
  description: 'Authentic sneakers and streetwear. Quality guaranteed.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = Boolean(session);
  const isAdmin = session?.role ? isAdminRole(session.role) : false;
  const userEmail = session?.user.email ?? session?.profile?.email;

  return (
    <html lang="en">
      <body className="bg-black text-white">
        <CartProvider>
          <ClientShell isAdmin={isAdmin} userEmail={userEmail}>
            <ScrollHeader isAuthenticated={isAuthenticated} userEmail={userEmail} />
            <main className="min-h-screen pt-16 pb-20 md:pb-0">{children}</main>
          </ClientShell>
        </CartProvider>
      </body>
    </html>
  );
}
