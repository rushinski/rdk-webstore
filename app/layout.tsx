// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/components/cart/CartProvider';
import { ScrollHeader } from '@/components/shell/ScrollHeader';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import { Footer } from '@/components/shell/Footer';
import { ClientShell } from '@/components/shell/ClientShell';
import { getServerSession } from '@/lib/auth/session';
import '@/styles/global.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Realdealkickzsc - Premium Sneakers & Streetwear',
  description: 'Authentic sneakers and streetwear. Quality guaranteed.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = Boolean(session);
  const isAdmin = session?.role === 'admin';
  const userEmail = session?.user.email ?? session?.profile?.email;

  return (
    <html lang="en">
      <body className="bg-black text-white">
        <CartProvider>
          <ClientShell>
            <ScrollHeader isAuthenticated={isAuthenticated} isAdmin={isAdmin} userEmail={userEmail} />
            <main className="min-h-screen pt-16 pb-20 md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
          </ClientShell>
        </CartProvider>
      </body>
    </html>
  );
}
