import { adminFormStyles } from "@/modules/shared/presentation/admin/ui/adminFormStyles";

const modalShellStyles = "w-full border border-brand-border bg-brand-surface shadow-xl";
const modalContentStyles = "space-y-5 p-6";

export function ShippingSettingsModalShell({
  title,
  description,
  maxWidthClassName = "max-w-2xl",
  onClose,
  children,
}: {
  title: string;
  description?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className={`${modalShellStyles} ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={modalContentStyles}>
          <div className="flex items-start justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
                {title}
              </h3>
              {description ? (
                <p className="mt-1 text-sm text-brand-muted">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-brand-muted transition hover:text-brand-text"
            >
              Close
            </button>
          </div>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ShippingSettingsField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={adminFormStyles.label}>{label}</label>
      {children}
      {error ? <div className={adminFormStyles.error}>{error}</div> : null}
    </div>
  );
}

