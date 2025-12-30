// app/(main)/contact/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
      <div className="text-zinc-400 mb-12 space-y-4">
        <p>
          Trying to sell sneakers, clothing, accessories, or anything you think we might want? Reach out. We&apos;re
          always buying.
        </p>
        <p>
          You can contact us through{" "}
          <a href="#contact-form" className="text-red-400 hover:underline">
            this contact form
          </a>
          , the{" "}
          <a href="/account" className="text-red-400 hover:underline">
            onsite messaging system
          </a>
          , by emailing us at{" "}
          <a href="mailto:realdealholyspill@gmail.com" className="text-red-400 hover:underline">
            Realdealholyspill@gmail.com
          </a>
          , or by sending us a DM on Instagram at{" "}
          <a
            href="https://instagram.com/realdealkickzllc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:underline"
          >
            @realdealkickzllc
          </a>
          .
        </p>
        <p>
          Need help putting together a fit? We offer fit services too. Submit your size, style, and any specific
          colors, shoes, or clothing you want included, and we will build a full outfit for you. You purchase it,
          and we will ship everything straight to you.
        </p>
        <p>Have questions or need anything else? Feel free to reach out.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-stretch">
        {/* Contact Form */}
        <div className="h-full">
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800/70 rounded text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800/70 rounded text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-semibold text-white mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800/70 rounded text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-white mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800/70 rounded text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            {status === 'success' && (
              <div className="p-4 bg-emerald-600/10 border border-emerald-600/40 text-emerald-400">
                Thank you for your message! We'll get back to you soon.
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-red-600/10 border border-red-600/40 text-red-400">
                Something went wrong. Please try again or email us directly.
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        <div className="h-full">
          {/* Image stack (matches the reference orientation) */}
          <div className="relative h-full min-h-[420px] overflow-visible">
            {/* Front / left card */}
            <div className="absolute left-[8%] top-[6%] w-[64%] max-w-[340px] aspect-[3/4] border border-zinc-800 bg-black shadow-2xl -rotate-[12deg] overflow-hidden z-20">
              <Image
                src="/images/fits/fit-1.png"
                alt="Outfit styling example 1"
                fill
                sizes="(min-width: 768px) 26vw, 70vw"
                className="object-cover"
              />
            </div>

            {/* Back / right card */}
            <div className="absolute left-[40%] top-[20%] w-[58%] max-w-[320px] aspect-[3/4] border border-zinc-800 bg-black shadow-2xl rotate-[10deg] overflow-hidden z-10">
              <Image
                src="/images/fits/fit-2.png"
                alt="Outfit styling example 2"
                fill
                sizes="(min-width: 768px) 24vw, 70vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
