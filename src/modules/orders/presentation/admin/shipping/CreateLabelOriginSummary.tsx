"use client";

type CreateLabelOriginSummaryProps = {
  originLine?: string | null;
};

export function CreateLabelOriginSummary({ originLine }: CreateLabelOriginSummaryProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
        Shipping From
      </div>
      <div className="text-sm text-brand-text">{originLine ?? "Not set"}</div>
      {!originLine ? (
        <div className="mt-1 text-xs text-red-700">
          Set the origin address in Shipping Settings.
        </div>
      ) : null}
    </div>
  );
}
