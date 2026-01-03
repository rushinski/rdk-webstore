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

      <div className="absolute inset-x-0 bottom-0 h-[90vh] max-h-[90vh] w-full bg-black border-t border-zinc-800/70 overflow-y-auto rounded-t-2xl md:rounded-none md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-h-none md:max-w-2xl md:border-t-0 md:border-l">
        <div className="p-6 md:p-8">
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
                {items.map((item) => {
                  const canIncrease = typeof item.maxStock === 'number'
                    ? item.quantity < item.maxStock
                    : true;
                  return (
                    <div key={`${item.productId}-${item.variantId}`} className="bg-zinc-900 p-4 rounded">
                    <div className="flex items-start gap-4">
                      <Link
                        href={`/store/${item.productId}`}
                        onClick={onClose}
                        className="flex items-start gap-4 flex-1 min-w-0"
                      >
                        <div className="w-20 h-20 relative flex-shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.titleDisplay}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold">{item.titleDisplay}</h3>
                          <p className="text-xs text-gray-500 mt-1">{item.brand} - {item.name}</p>
                          <p className="text-sm text-gray-400 mt-2">Size: {item.sizeLabel}</p>
                          <p className="text-sm text-gray-300 mt-1">
                            Price: ${(item.priceCents / 100).toFixed(2)}
                          </p>
                        </div>
                      </Link>
                      <div className="flex flex-col items-end gap-3">
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700"
                          >
                            <Minus className="w-3 h-3 text-white" />
                          </button>
                          <span className="text-white w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                            disabled={!canIncrease}
                            className={`w-7 h-7 flex items-center justify-center rounded ${
                              canIncrease ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-900 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          ${(item.priceCents * item.quantity / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-800/70 pt-4 mb-4">
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
