// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/components/cart/CartProvider';
import { ScrollHeader } from '@/components/shell/ScrollHeader';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import { Footer } from '@/components/shell/Footer';
import { ClientShell } from '@/components/shell/ClientShell';
import '@/styles/global.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Real Deal Kickz - Premium Sneakers & Streetwear',
  description: 'Authentic sneakers and streetwear. Quality guaranteed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <CartProvider>
          <ClientShell>
            <ScrollHeader />
            <main className="min-h-screen pt-16 pb-20 md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
          </ClientShell>
        </CartProvider>
      </body>
    </html>
  );
}