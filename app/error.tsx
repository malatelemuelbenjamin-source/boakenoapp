"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss-600">MyBoakeno</p>
      <h1 className="text-2xl font-bold text-moss-900">Something went wrong</h1>
      <p className="text-sm text-moss-700">
        The page could not load. If you just deployed this app, check that the database environment variables{" "}
        <code className="rounded bg-moss-50 px-1 py-0.5 text-[12px]">TURSO_DATABASE_URL</code> and{" "}
        <code className="rounded bg-moss-50 px-1 py-0.5 text-[12px]">TURSO_AUTH_TOKEN</code> are set in your hosting
        project, then try again.
      </p>
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-moss-700 px-5 py-2 text-sm font-semibold text-white hover:bg-moss-800"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-moss-200 px-5 py-2 text-sm font-semibold text-moss-800 hover:bg-moss-50"
        >
          Go home
        </a>
      </div>
      {error.digest ? <p className="text-[11px] text-moss-500">Reference: {error.digest}</p> : null}
    </main>
  );
}
