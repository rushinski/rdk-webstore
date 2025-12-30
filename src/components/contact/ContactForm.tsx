'use client';

import { useEffect, useState } from 'react';

type ContactFormSource = 'contact_form' | 'bug_report';

type ContactFormProps = {
  source?: ContactFormSource;
  initialSubject?: string;
  initialMessage?: string;
};

export function ContactForm({
  source = 'contact_form',
  initialSubject = '',
  initialMessage = '',
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subject: prev.subject || initialSubject,
      message: prev.message || initialMessage,
    }));
  }, [initialSubject, initialMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setStatus('success');
        setFormData({
          name: '',
          email: '',
          subject: initialSubject,
          message: initialMessage,
        });
      } else {
        setStatus('error');
        setErrorMessage(data?.error ?? 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again or email us directly.');
    }
  };

  return (
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
          Thank you for your message! We&apos;ll get back to you soon.
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-600/10 border border-red-600/40 text-red-400">
          {errorMessage ?? 'Something went wrong. Please try again or email us directly.'}
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
  );
}
