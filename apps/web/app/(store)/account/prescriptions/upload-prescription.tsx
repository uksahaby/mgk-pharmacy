"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/client-api";
import { FileField, SubmitButton, TextArea, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

export function UploadPrescription() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ patientName: "", prescriberName: "", facility: "", issuedOn: "", notes: "" });
  const [done, setDone] = useState(false);
  const { pending, error, fields, run, setError } = useSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return setError("Please choose a photo or PDF of your prescription.");
        const fd = new FormData();
        fd.set("file", file);
        Object.entries(form).forEach(([k, v]) => v && fd.set(k, v));
        const ok = await run(() => api("/prescriptions", { form: fd }));
        if (ok) {
          setDone(true);
          setFile(null);
          setForm({ patientName: "", prescriberName: "", facility: "", issuedOn: "", notes: "" });
          router.refresh();
        }
      }}
    >
      <h2 className="text-lg font-semibold">Upload a prescription</h2>
      {done && <Alert tone="success" title="Uploaded">A pharmacist will review it shortly. You can attach it at checkout right away.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <FileField label="Prescription file" file={file} onFile={setFile} />
      <TextField label="Patient's full name" value={form.patientName} onChange={set("patientName")} error={fields.patientName} required />
      <TextField label="Prescriber" optional placeholder="e.g. Dr. A. Yusuf" value={form.prescriberName} onChange={set("prescriberName")} />
      <TextField label="Hospital or clinic" optional value={form.facility} onChange={set("facility")} />
      <TextField label="Date issued" optional type="date" value={form.issuedOn} onChange={set("issuedOn")} />
      <TextArea label="Notes for the pharmacist" optional value={form.notes} onChange={set("notes")} placeholder="Allergies, other medicines you take, or questions" />
      <SubmitButton pending={pending} className="btn-primary w-full">
        <Upload className="h-4 w-4" aria-hidden /> Upload for review
      </SubmitButton>
      <p className="text-xs leading-relaxed text-ink-muted">
        Files are stored privately and only seen by our pharmacists. We keep prescription records for 5 years as required by PCN rules.
      </p>
    </form>
  );
}
