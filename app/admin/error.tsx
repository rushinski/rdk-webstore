import { AdminErrorPageContent } from "@/modules/app-shell/presentation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AdminErrorPageContent error={error} reset={reset} />;
}
