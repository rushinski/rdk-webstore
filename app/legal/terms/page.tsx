// app/(main)/legal/terms/page.tsx
export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
      
      <div className="prose prose-invert max-w-none">
        <div className="text-zinc-400 space-y-6">
          <p className="text-sm">Last Updated: December 20, 2024</p>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Real Deal Kickz ("we," "our," or "us"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Product Authenticity</h2>
            <p>
              Real Deal Kickz is committed to selling only authentic sneakers and streetwear. All products sold on our platform are verified for authenticity. We guarantee that every item is 100% authentic or your money back.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Pricing and Payment</h2>
            <p>
              All prices are listed in USD. We reserve the right to change prices at any time without notice. Payment is due at the time of purchase. We accept major credit cards and other payment methods as indicated on our site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Orders and Fulfillment</h2>
            <p>
              Once an order is placed, you will receive a confirmation email. We typically process orders within 1-2 business days. Shipping times vary based on your location and chosen shipping method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Returns and Refunds</h2>
            <p>
              We accept returns within 14 days of delivery for unworn items in original condition with all tags attached. Refunds will be issued to the original payment method within 5-10 business days of receiving the returned item.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Account Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Prohibited Uses</h2>
            <p>
              You may not use our site for any illegal or unauthorized purpose. You must not, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              Real Deal Kickz shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the site following any changes indicates your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
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