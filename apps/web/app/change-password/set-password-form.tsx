"use client";

import { useState } from "react";
import { api } from "@/lib/client-api";
import { SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import { SignOutButton } from "@/components/layout/header";

export function SetPasswordForm({ next }: { next: string }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const { pending, error, fields, run, setError } = useSubmit();
  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirm) return setError("The two new passwords don't match.");
        const ok = await run(() => api("/auth/change-password", { json: { currentPassword: form.currentPassword, newPassword: form.newPassword } }));
        if (ok) window.location.href = next;
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Temporary password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <TextField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} error={fields.newPassword} hint="At least 8 characters, with a letter and a number." />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <SubmitButton pending={pending} className="btn-primary btn-lg w-full">Save and continue</SubmitButton>
      <SignOutButton className="justify-center !text-ink-muted" />
    </form>
  );
}
