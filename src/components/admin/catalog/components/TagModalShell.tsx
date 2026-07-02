type TagModalShellProps = {
  children: React.ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
};

export function TagModalShell({
  children,
  description,
  onClose,
  title,
}: TagModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-brand-border bg-brand-surface p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
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
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
