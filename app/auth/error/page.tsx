interface ErrorPageProps {
  searchParams: { error?: string };
}

export default function ErrorPage({ searchParams }: ErrorPageProps) {
  const msg = searchParams.error ?? "An unexpected error occurred.";

  return (
    <div className="max-w-md mx-auto py-10 text-center">
      <h1 className="text-xl font-semibold mb-4">Error</h1>
      <p className="text-red-500">{msg}</p>
      <a href="/auth/login" className="underline block mt-6">
        Return to login
      </a>
    </div>
  );
}
