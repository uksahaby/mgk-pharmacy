"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/client-api";
import { SelectField, SubmitButton, TextArea, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

const empty = { name: "", email: "", phone: "", topic: "ORDER", message: "" };

export function ContactForm() {
  const [form, setForm] = useState(empty);
  const [sent, setSent] = useState(false);
  const { pending, error, fields, run } = useSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  if (sent) {
    return (
      <div className="card p-8">
        <Alert tone="success" title="Message sent">
          Thanks, {form.name.split(" ")[0] || "there"}. We'll reply to {form.email} within one working day. For anything urgent, WhatsApp us.
        </Alert>
        <button className="btn-outline mt-4" onClick={() => { setForm(empty); setSent(false); }}>Send another message</button>
      </div>
    );
  }

  return (
    <form
      className="card space-y-4 p-6 sm:p-8"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => api("/contact", { json: form }));
        if (ok) setSent(true);
      }}
    >
      <h2 className="text-xl font-semibold">Send us a message</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Your name" autoComplete="name" value={form.name} onChange={set("name")} error={fields.name} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={fields.email} />
        <TextField label="Phone" optional type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        <SelectField label="Topic" value={form.topic} onChange={set("topic")}>
          <option value="ORDER">An existing order</option>
          <option value="PRESCRIPTION">A prescription</option>
          <option value="PRODUCT">Product availability or advice</option>
          <option value="FEEDBACK">Feedback or a complaint</option>
          <option value="OTHER">Something else</option>
        </SelectField>
      </div>
      <TextArea label="Message" rows={6} value={form.message} onChange={set("message")} error={fields.message} placeholder="Include your order number if it's about an order." />
      <p className="text-xs text-ink-muted">Please don't send prescriptions here. Upload them securely from your account instead.</p>
      <SubmitButton pending={pending}>
        <Send className="h-4 w-4" aria-hidden /> Send message
      </SubmitButton>
    </form>
  );
}
