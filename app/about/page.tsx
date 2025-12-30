// app/(main)/about/page.tsx
import { Shield, TrendingUp, Users, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-white mb-4">About Real Deal Kickz</h1>
      <p className="text-xl text-zinc-400 mb-12">
        Your trusted source for authentic sneakers and streetwear since day one.
      </p>

      {/* Story Section */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
          <div className="space-y-4 text-zinc-400">
            <p>
              Realdealkickzsc started with a simple mission: to provide sneaker enthusiasts with authentic, verified products they can trust. Based in Simpsonville, South Carolina, we've built a reputation for quality, authenticity, and exceptional customer service.
            </p>
            <p>
              Every pair that passes through our doors is carefully inspected and authenticated by our team of experts. We understand the passion behind sneaker culture, and we're committed to serving our community with integrity and transparency.
            </p>
            <p>
              From limited releases to classic favorites, we curate a selection of the most sought-after sneakers and streetwear. Our goal is to make premium footwear and apparel accessible to everyone who shares our passion.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white mb-6">What Sets Us Apart</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-red-600/10 border border-red-600/40 flex-shrink-0">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">100% Authentic</h3>
                <p className="text-zinc-400 text-sm">
                  Every product is verified for authenticity. We guarantee genuine products or your money back.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-red-600/10 border border-red-600/40 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Latest Releases</h3>
                <p className="text-zinc-400 text-sm">
                  Stay ahead with early access to the hottest drops and limited editions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-red-600/10 border border-red-600/40 flex-shrink-0">
                <Users className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Community First</h3>
                <p className="text-zinc-400 text-sm">
                  Built by sneakerheads, for sneakerheads. We're part of the culture we serve.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-red-600/10 border border-red-600/40 flex-shrink-0">
                <Award className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Trusted Service</h3>
                <p className="text-zinc-400 text-sm">
                  Fast shipping, secure packaging, and customer support that actually cares.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6">Visit Us</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <h3 className="font-semibold text-white mb-4">Location</h3>
            <p className="text-zinc-400 mb-6">
              Realdealkickzsc<br />
              Simpsonville, SC 29680<br />
              United States
            </p>
            <h3 className="font-semibold text-white mb-4">Hours</h3>
            <div className="space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>Monday - Friday</span>
                <span>9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span>10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d104449.83433192856!2d-82.35408689999999!3d34.730769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88582f4e1f9f5555%3A0x1234567890abcdef!2sSimpsonville%2C%20SC!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-8">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Commitment</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="font-semibold text-white mb-3">Authenticity Guaranteed</h3>
            <p className="text-zinc-400 text-sm">
              We stand behind every product we sell with a 100% authenticity guarantee.
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-white mb-3">Customer Satisfaction</h3>
            <p className="text-zinc-400 text-sm">
              Your satisfaction is our priority. We're here to help every step of the way.
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-white mb-3">Community Support</h3>
            <p className="text-zinc-400 text-sm">
              We give back to the sneaker community and support local events and causes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}