import { SystemErrorPageContent } from "@/modules/app-shell/presentation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SystemErrorPageContent error={error} reset={reset} />;
}
