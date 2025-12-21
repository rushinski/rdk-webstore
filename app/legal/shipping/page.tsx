// app/(main)/legal/shipping/page.tsx
export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-white mb-8">Shipping & Returns</h1>
      
      <div className="prose prose-invert max-w-none">
        <div className="text-zinc-400 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Shipping Information</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Processing Time</h3>
            <p>
              Orders are typically processed within 1-2 business days (Monday-Friday, excluding holidays). You will receive a confirmation email once your order has been processed and shipped.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Shipping Methods & Times</h3>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Standard Shipping:</strong> 5-7 business days</li>
              <li><strong>Express Shipping:</strong> 2-3 business days</li>
              <li><strong>Next Day:</strong> 1 business day (orders placed before 2 PM EST)</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Shipping Costs</h3>
            <p>
              Shipping costs are calculated at checkout based on your location and chosen shipping method. Free standard shipping on orders over $150.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">International Shipping</h3>
            <p>
              We currently ship within the United States only. International shipping may be available in the future.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Tracking Your Order</h3>
            <p>
              Once your order ships, you'll receive a tracking number via email. You can track your package using this number on the carrier's website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-12 mb-4">Return Policy</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Return Window</h3>
            <p>
              We accept returns within 14 days of delivery. Items must be unworn, in original condition, with all tags attached and in original packaging.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Return Process</h3>
            <ol className="list-decimal pl-6 mt-2 space-y-2">
              <li>Contact us at returns@realdealkickz.com to initiate your return</li>
              <li>We'll provide you with a return shipping label</li>
              <li>Pack the item securely in its original packaging</li>
              <li>Ship the item back to us using the provided label</li>
              <li>Refund will be processed within 5-10 business days of receiving the returned item</li>
            </ol>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Non-Returnable Items</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Worn or used items</li>
              <li>Items without original tags or packaging</li>
              <li>Sale or clearance items (unless defective)</li>
              <li>Gift cards</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Defective or Damaged Items</h3>
            <p>
              If you receive a defective or damaged item, please contact us within 48 hours of delivery at support@realdealkickz.com with photos of the issue. We'll arrange for a replacement or full refund at no cost to you.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Exchanges</h3>
            <p>
              We do not offer direct exchanges. If you need a different size or item, please return your original purchase and place a new order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-12 mb-4">Contact Us</h2>
            <p>
              For any shipping or return questions, please contact us at:
            </p>
            <p className="mt-2">
              Real Deal Kickz<br />
              Simpsonville, SC<br />
              Email: support@realdealkickz.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}