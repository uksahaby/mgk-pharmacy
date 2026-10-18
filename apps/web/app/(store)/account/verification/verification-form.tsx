"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/client-api";
import { FileField, SelectField, SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import { idTypeLabel } from "@/lib/format";

const TYPES = [
  { value: "PATIENT", title: "Patient or caregiver", body: "Buying for yourself or someone you care for." },
  { value: "DOCTOR", title: "Medical doctor", body: "Requires your MDCN licence." },
  { value: "PHARMACIST", title: "Pharmacist", body: "Requires your PCN annual licence." },
] as const;

export function VerificationForm() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("PATIENT");
  const [idType, setIdType] = useState("NIN");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const { pending, error, fields, run, setError } = useSubmit();
  const professional = type !== "PATIENT";

  return (
    <form
      className="card space-y-6 p-5 sm:p-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!idDoc) return setError("Please upload a photo of your ID.");
        if (professional && (!license || !licenseNumber)) return setError("Please add your licence number and a copy of your licence.");
        const fd = new FormData();
        fd.set("type", type);
        fd.set("idType", idType);
        fd.set("idDocument", idDoc);
        fd.set("consent", String(consent));
        if (professional && license) {
          fd.set("license", license);
          fd.set("licenseNumber", licenseNumber);
        }
        const ok = await run(() => api("/verification", { form: fd }));
        if (ok) router.refresh();
      }}
    >
      <h2 className="text-lg font-semibold">Submit your documents</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <fieldset>
        <legend className="label">I am a…</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((t) => (
            <label key={t.value} className={clsx("cursor-pointer rounded-xl border p-4 text-sm transition", type === t.value ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
              <input type="radio" name="type" className="sr-only" checked={type === t.value} onChange={() => setType(t.value)} />
              <span className="block font-semibold">{t.title}</span>
              <span className="mt-0.5 block text-ink-muted">{t.body}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="ID type" value={idType} onChange={(e) => setIdType(e.target.value)}>
          {Object.entries(idTypeLabel).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </SelectField>
        <FileField label="Photo of your ID" file={idDoc} onFile={setIdDoc} hint="All four corners visible, text readable." />
        {professional && (
          <>
            <TextField label={type === "DOCTOR" ? "MDCN folio/licence number" : "PCN registration number"} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} error={fields.licenseNumber} />
            <FileField label={type === "DOCTOR" ? "MDCN practising licence" : "PCN annual licence"} file={license} onFile={setLicense} />
          </>
        )}
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I confirm these documents are genuine and belong to me, and I consent to MGK Pharmacy verifying them.</span>
      </label>
      {fields.consent && <p className="field-error -mt-4">{fields.consent}</p>}
      <SubmitButton pending={pending} className="btn-primary">Submit for verification</SubmitButton>
    </form>
  );
}
