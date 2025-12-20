// app/cart/page.tsx

'use client';

import { useCart } from '@/components/cart/CartProvider';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">Add some items to get started</p>
        <Link
          href="/store"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded transition"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="bg-zinc-900 border border-red-900/20 rounded p-4 flex gap-4"
            >
              <div className="w-24 h-24 relative flex-shrink-0">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover rounded"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold truncate">{item.brand}</h3>
                <p className="text-gray-400 text-sm truncate">{item.name}</p>
                <p className="text-gray-400 text-sm">Size: {item.sizeLabel}</p>
                <p className="text-white font-bold mt-2">
                  ${(item.priceCents / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity - 1)
                    }
                    className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-semibold w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity + 1)
                    }
                    className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-red-900/20 rounded p-6 sticky top-20">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${(total / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-red-900/20 pt-3">
                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition mb-3">
              Proceed to Checkout
            </button>

            <Link
              href="/store"
              className="block text-center text-gray-400 hover:text-white text-sm"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}