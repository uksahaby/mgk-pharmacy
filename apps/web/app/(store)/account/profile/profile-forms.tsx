"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { formatPhone } from "@/lib/format";
import type { User } from "@/lib/types";
import { SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, phone: formatPhone(user.phone) });
  const [saved, setSaved] = useState(false);
  const { pending, error, fields, run } = useSubmit();
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setSaved(false);
        const ok = await run(() => api("/account/profile", { method: "PATCH", json: form }));
        if (ok) {
          setSaved(true);
          router.refresh();
        }
      }}
    >
      <h2 className="text-lg font-semibold">Personal details</h2>
      {saved && <Alert tone="success">Your details have been updated.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={fields.firstName} />
        <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={fields.lastName} />
      </div>
      <TextField label="Email" value={user.email} disabled hint="Contact us to change the email on your account." />
      <TextField label="Mobile number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fields.phone} />
      <SubmitButton pending={pending}>Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [saved, setSaved] = useState(false);
  const { pending, error, fields, run } = useSubmit();
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setSaved(false);
        const ok = await run(() => api("/auth/change-password", { json: form }));
        if (ok) {
          setSaved(true);
          setForm({ currentPassword: "", newPassword: "" });
        }
      }}
    >
      <h2 className="text-lg font-semibold">Change password</h2>
      {saved && <Alert tone="success">Password changed.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <TextField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} error={fields.newPassword} hint="At least 8 characters, with a letter and a number." />
      <SubmitButton pending={pending} className="btn-dark">Update password</SubmitButton>
    </form>
  );
}
