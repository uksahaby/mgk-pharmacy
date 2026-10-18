import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track your order", description: "Check the status of your MGK Pharmacy order." };

export default function TrackPage() {
  return (
    <div className="container max-w-xl py-12">
      <div className="card p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <PackageSearch className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Track your order</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter your order number (it starts with MGK-) and the email you used at checkout. You'll find both in your confirmation email.
        </p>
        <TrackForm />
      </div>
    </div>
  );
}
