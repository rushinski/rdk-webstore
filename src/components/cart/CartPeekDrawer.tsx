// src/components/cart/CartPeekDrawer.tsx
'use client';

import { X, Maximize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';

interface CartPeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartPeekDrawer({ isOpen, onClose }: CartPeekDrawerProps) {
  const router = useRouter();
  const { items, total } = useCart();

  if (!isOpen) return null;

  const handleExpand = () => {
    router.push('/cart');
    onClose();
  };

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="absolute bottom-0 left-0 right-0 bg-black border-t border-zinc-800/70 rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Cart ({items.length})</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-lg font-bold text-white mb-4">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>

                <button
                  onClick={handleExpand}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded transition flex items-center justify-center gap-2 mb-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  View Full Cart
                </button>

                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition">
                  Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}