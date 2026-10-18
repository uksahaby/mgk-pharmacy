import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex max-w-xl flex-col items-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn't find that page</h1>
      <p className="mt-3 text-ink-muted">It may have moved, or the link might be mistyped. Try searching for what you need.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">Browse products</Link>
        <Link href="/" className="btn-outline">Go to homepage</Link>
      </div>
    </div>
  );
}
