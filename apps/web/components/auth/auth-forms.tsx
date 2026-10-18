"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/client-api";
import { SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next?: string) {
  // Without an explicit destination, go back to /login, which forwards each role to its own home page.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/login";
}

function PasswordField({ label, value, onChange, error, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField label={label} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} error={error} hint={hint} required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] rounded p-1 text-ink-muted hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, fields, run } = useSubmit();
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => api("/auth/login", { json: { email, password } }));
        if (ok) window.location.href = safeNext(next);
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
      <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={fields.password} />
      <SubmitButton pending={pending} className="btn-primary btn-lg w-full">Sign in</SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-ink-muted">Forgot your password? Contact us on WhatsApp and we'll help you reset it securely.</p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const { pending, error, fields, run } = useSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => api("/auth/register", { json: { ...form, acceptTerms, marketingOptIn } }));
        if (ok) window.location.href = safeNext(next);
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} error={fields.firstName} required />
        <TextField label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} error={fields.lastName} required />
      </div>
      <TextField label="Email address" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={fields.email} required />
      <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone} onChange={set("phone")} error={fields.phone} hint="WhatsApp-enabled, for order updates." required />
      <PasswordField label="Create a password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={fields.password} hint="At least 8 characters, with a letter and a number." />
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
        <span>
          I agree to the <Link href="/terms" target="_blank" className="font-medium underline">terms</Link> and <Link href="/privacy" target="_blank" className="font-medium underline">privacy policy</Link>.
        </span>
      </label>
      {fields.acceptTerms && <p className="field-error -mt-2">{fields.acceptTerms}</p>}
      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
        <span>Send me occasional health tips and offers (optional). Your prescription data is never used for marketing.</span>
      </label>
      <SubmitButton pending={pending} className="btn-primary btn-lg w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
