"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

export function TrackForm() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const { pending, error, fields, run } = useSubmit();
  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run(() => api<{ number: string; accessKey: string }>("/orders/track", { json: { number, email } }));
        if (res) router.push(`/order/${res.number}?key=${res.accessKey}`);
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Order number" placeholder="MGK-261015-123456" value={number} onChange={(e) => setNumber(e.target.value)} error={fields.number} autoCapitalize="characters" required />
      <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
      <SubmitButton pending={pending} className="btn-primary btn-lg w-full">Find my order</SubmitButton>
    </form>
  );
}
