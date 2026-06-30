"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonStyles } from "@/components/ui/buttonStyles";
import { useCart } from "@/components/cart/CartProvider";

export function StorefrontCartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { items, total, removeItem, updateQuantity } = useCart();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-label="Close cart"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-brand-surface md:w-[420px]">
        <header className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 className="text-lg font-bold text-brand-text">My cart • {items.length}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-text"
            aria-label="Close cart drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-brand-muted">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="border-b border-brand-border px-6 py-3">
              <div className="text-sm font-medium text-brand-text">
                Order ships by next business day
              </div>
              <div className="text-xs text-brand-muted">Express Shipping Available</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="grid grid-cols-[5rem_1fr_auto] gap-4 border-b border-brand-border px-6 py-4"
                >
                  <div className="relative h-20 w-20 bg-brand-page">
                    <Image
                      src={item.imageUrl}
                      alt={item.titleDisplay}
                      fill
                      sizes="80px"
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase text-brand-text">
                      {item.titleDisplay}
                    </div>
                    <div className="mt-2 text-xs text-brand-muted">
                      Size: {item.sizeLabel}
                    </div>
                    {item.brand ? (
                      <div className="text-xs text-brand-muted">Brand: {item.brand}</div>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity - 1,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center border border-brand-border text-brand-text hover:bg-brand-text hover:text-brand-surface"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm text-brand-text">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity + 1,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center border border-brand-border text-brand-text hover:bg-brand-text hover:text-brand-surface"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="text-brand-muted hover:text-brand-text"
                      aria-label={`Remove ${item.titleDisplay}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-bold text-brand-text">
                      ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <footer className="border-t border-brand-border px-6 py-4">
              <div className="flex items-center justify-between text-sm font-bold text-brand-text">
                <span>Subtotal</span>
                <span>${(total / 100).toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/checkout");
                }}
                className={`${buttonStyles.primary} mt-3 w-full`}
              >
                Checkout • ${(total / 100).toFixed(2)}
              </button>
              <div className="mt-2 text-center">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="text-xs text-brand-muted underline hover:text-brand-text"
                >
                  continue shopping
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
