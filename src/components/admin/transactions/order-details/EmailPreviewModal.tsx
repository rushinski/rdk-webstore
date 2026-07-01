import { X } from "lucide-react";

import type { EmailLog } from "./types";

type EmailPreviewModalProps = {
  emailPreview: EmailLog | null;
  title: string;
  onClose: () => void;
};

export function EmailPreviewModal({
  emailPreview,
  title,
  onClose,
}: EmailPreviewModalProps) {
  if (!emailPreview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-brand-border bg-brand-surface">
        <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-text">{title}</p>
            <p className="text-xs text-brand-muted">{emailPreview.subject}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-muted transition-colors hover:text-brand-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            srcDoc={emailPreview.html_snapshot ?? ""}
            title="Email preview"
            className="h-full min-h-[500px] w-full"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
