'use client';

import { useEffect, useState } from 'react';

type ContactFormSource = 'contact_form' | 'bug_report';

type ContactFormProps = {
  source?: ContactFormSource;
  initialSubject?: string;
  initialMessage?: string;
  messagePlaceholder?: string;
};

export function ContactForm({
  source = 'contact_form',
  initialSubject = '',
  initialMessage = '',
  messagePlaceholder,
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const maxAttachments = 3;
  const maxAttachmentSize = 5 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subject: prev.subject || initialSubject,
      message: prev.message || initialMessage,
    }));
  }, [initialSubject, initialMessage]);

  const handleAttachments = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const next: File[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported image type.`);
        continue;
      }
      if (file.size > maxAttachmentSize) {
        errors.push(`"${file.name}" is larger than 5MB.`);
        continue;
      }
      next.push(file);
    }

    if (attachments.length + next.length > maxAttachments) {
      errors.push(`You can upload up to ${maxAttachments} images.`);
    }

    const trimmed = next.slice(0, Math.max(0, maxAttachments - attachments.length));
    setAttachments((prev) => [...prev, ...trimmed]);
    setAttachmentError(errors.length > 0 ? errors.join(' ') : null);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage(null);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('email', formData.email);
      payload.append('subject', formData.subject);
      payload.append('message', formData.message);
      payload.append('source', source);
      attachments.forEach((file) => payload.append('attachments', file));

      const response = await fetch('/api/contact', {
        method: 'POST',
        body: payload,
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
        setAttachments([]);
        setAttachmentError(null);
      } else {
        setStatus('error');
        setErrorMessage(data?.error ?? 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again or email us directly.');
    }
  };

  const attachmentsLabel = source === 'bug_report' ? 'Screenshots (optional)' : 'Photos (optional)';
  const attachmentsHint = source === 'bug_report'
    ? 'PNG, JPG, or WEBP. Up to 3 screenshots, 5MB each.'
    : 'PNG, JPG, or WEBP. Up to 3 photos, 5MB each.';
  const resolvedPlaceholder =
    messagePlaceholder ??
    (source === 'bug_report'
      ? 'Share the steps, where it happened, and what you expected to see.'
      : undefined);

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
          placeholder={resolvedPlaceholder}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800/70 rounded text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
        />
      </div>

      <div>
        <label htmlFor="attachments" className="block text-sm font-semibold text-white mb-2">
          {attachmentsLabel}
        </label>
        <div className="rounded border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-4">
          <input
            id="attachments"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => handleAttachments(e.target.files)}
            className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-700"
          />
          <p className="text-xs text-zinc-500 mt-2">{attachmentsHint}</p>
          {attachmentError && <p className="text-xs text-red-400 mt-2">{attachmentError}</p>}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
