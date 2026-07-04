import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type NexusTrackerStatusAlertProps = {
  taxEnabled: boolean;
};

export function NexusTrackerStatusAlert({ taxEnabled }: NexusTrackerStatusAlertProps) {
  if (taxEnabled) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-amber-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
      <div className="text-sm">
        Taxes are turned off. Go to{" "}
        <Link
          href="/admin/settings/taxes"
          className="underline underline-offset-2 text-amber-900 hover:text-amber-700"
        >
          Settings &gt; Taxes
        </Link>{" "}
        to enable tax collection before using the nexus tracker.
      </div>
    </div>
  );
}
