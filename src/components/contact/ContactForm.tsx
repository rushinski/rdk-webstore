// src/components/contact/ContactForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { security } from "@/config/security";
import { Toast } from "@/components/ui/Toast";

type ContactFormSource = "contact_form" | "bug_report";

type ContactFormProps = {
  source?: ContactFormSource;
  initialSubject?: string;
  initialMessage?: string;
  messagePlaceholder?: string;
};

export function ContactForm({
  source = "contact_form",
  initialSubject = "",
  initialMessage = "",
  messagePlaceholder,
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { attachments: attachmentConfig } = security.contact;
  const maxAttachments = attachmentConfig.maxFiles;
  const maxAttachmentSize = attachmentConfig.maxBytes;
  const allowedTypes = attachmentConfig.allowedTypes.map((type) => type);
  const maxAttachmentSizeMb = Math.max(1, Math.round(maxAttachmentSize / (1024 * 1024)));
  const allowedTypesSet = useMemo(() => new Set<string>(allowedTypes), [allowedTypes]);
  const storageKey =
    source === "bug_report" ? "rdk_bug_report_draft" : "rdk_contact_draft";
  const draftRef = useRef(formData);

  const previews = useMemo(
    () => attachments.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [attachments],
  );

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subject: prev.subject || initialSubject,
      message: prev.message || initialMessage,
    }));
  }, [initialSubject, initialMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    sessionStorage.removeItem(storageKey);
    try {
      const parsed = JSON.parse(stored) as Partial<typeof formData>;
      setFormData((prev) => ({
        name: parsed.name ?? prev.name,
        email: parsed.email ?? prev.email,
        subject: parsed.subject ?? prev.subject,
        message: parsed.message ?? prev.message,
      }));
    } catch {
      // Ignore malformed drafts.
    }
  }, [storageKey]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleBeforeUnload = () => {
      const draft = draftRef.current;
      const hasDraft = draft.name || draft.email || draft.subject || draft.message;

      if (!hasDraft) {
        sessionStorage.removeItem(storageKey);
        return;
      }

      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [storageKey]);

  useEffect(() => {
    draftRef.current = formData;
  }, [formData]);

  const handleAttachments = (files: FileList | null) => {
    if (!files) {
      return;
    }
    const incoming = Array.from(files);
    const next: File[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      if (!allowedTypesSet.has(file.type)) {
        errors.push(`"${file.name}" is not a supported image type.`);
        continue;
      }
      if (file.size > maxAttachmentSize) {
        errors.push(`"${file.name}" is larger than ${maxAttachmentSizeMb}MB.`);
        continue;
      }
      next.push(file);
    }

    if (attachments.length + next.length > maxAttachments) {
      errors.push(`You can upload up to ${maxAttachments} images.`);
    }

    const trimmed = next.slice(0, Math.max(0, maxAttachments - attachments.length));
    setAttachments((prev) => [...prev, ...trimmed]);
    setAttachmentError(errors.length > 0 ? errors.join(" ") : null);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleAttachments(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setToast(null);

    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("email", formData.email);
      payload.append("subject", formData.subject);
      payload.append("message", formData.message);
      payload.append("source", source);
      attachments.forEach((file) => payload.append("attachments", file));

      const response = await fetch("/api/contact", {
        method: "POST",
        body: payload,
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          subject: initialSubject,
          message: initialMessage,
        });
        setAttachments([]);
        setAttachmentError(null);
        setToast({
          message: "Thank you for your message! We'll get back to you soon.",
          tone: "success",
        });
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(storageKey);
        }
      } else {
        setStatus("error");
        setToast({
          message: data?.error ?? "Something went wrong. Please try again.",
          tone: "error",
        });
      }
    } catch (error) {
      setStatus("error");
      setToast({
        message: "Something went wrong. Please try again or email us directly.",
        tone: "error",
      });
    }
  };

  const attachmentsLabel = source === "bug_report" ? "Screenshots" : "Photos";
  const attachmentsHint =
    source === "bug_report"
      ? `PNG, JPG, or WEBP. Up to ${maxAttachments} screenshots, ${maxAttachmentSizeMb}MB each.`
      : `PNG, JPG, or WEBP. Up to ${maxAttachments} photos, ${maxAttachmentSizeMb}MB each.`;
  const resolvedPlaceholder =
    messagePlaceholder ??
    (source === "bug_report"
      ? "Share the steps, where it happened, and what you expected to see."
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
        <label
          htmlFor="attachments"
          className="block text-sm font-semibold text-white mb-2"
        >
          {attachmentsLabel}
        </label>
        <div
          className={`rounded border border-dashed px-4 py-4 transition-colors ${
            isDragging
              ? "border-red-500/70 bg-red-500/5"
              : "border-zinc-700 bg-zinc-900/40"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            id="attachments"
            type="file"
            accept={allowedTypes.join(",")}
            multiple
            onChange={(e) => handleAttachments(e.target.files)}
            className="block w-full text-sm text-zinc-300 cursor-pointer file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:cursor-pointer hover:file:bg-red-700"
          />
          <p className="text-xs text-zinc-500 mt-2">{attachmentsHint}</p>
          {attachmentError && (
            <p className="text-xs text-red-400 mt-2">{attachmentError}</p>
          )}
          {attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative">
                  <img
                    src={preview.url}
                    alt={preview.file.name}
                    className="h-20 w-full object-cover rounded border border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white hover:bg-black"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </form>
  );
}
