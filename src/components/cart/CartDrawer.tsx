// src/components/cart/CartDrawer.tsx (UPDATE - add checkout navigation)

'use client';

import { X, Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, total } = useCart();

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-black border-l border-red-900/20 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 bg-zinc-900 p-4 rounded">
                    <div className="w-20 h-20 relative flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{item.brand}</h3>
                      <p className="text-gray-400 text-sm truncate">{item.name}</p>
                      <p className="text-gray-400 text-sm">Size: {item.sizeLabel}</p>
                      <p className="text-white font-bold mt-1">
                        ${(item.priceCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-white w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-red-900/20 pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
              >
                Checkout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}