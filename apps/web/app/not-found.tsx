import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <Link href="/" className="btn-primary mt-6">Go to homepage</Link>
      </div>
    </main>
  );
}
