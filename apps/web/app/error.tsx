"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Something went wrong</p>
        <h1 className="mt-2 text-3xl font-bold">We hit a snag loading this page</h1>
        <p className="mt-3 text-ink-muted">Please try again. If it keeps happening, our team is a WhatsApp message away.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary">Try again</button>
          <Link href="/" className="btn-outline">Homepage</Link>
        </div>
      </div>
    </main>
  );
}
