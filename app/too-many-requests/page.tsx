'use client';

export default function TooManyRequestsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Real Deal Kickz
        </p>
        <div className="inline-flex items-center gap-3 justify-center">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">429</span>
          <span className="h-px w-10 bg-zinc-800" />
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">Cool down</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Slow it down, we are restocking</h1>
        <p className="text-zinc-400">
          You are moving fast. Take a quick breather and try again in a moment.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="px-4 py-2 rounded bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Back to home
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
