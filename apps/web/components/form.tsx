"use client";

import { useCallback, useId, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/client-api";

type BaseProps = { label: string; error?: string; hint?: React.ReactNode; optional?: boolean; className?: string };

export function TextField({
  label,
  error,
  hint,
  optional,
  className,
  ...input
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </label>
      <input
        id={id}
        className={clsx("input", error && "input-error")}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...input}
      />
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  error,
  hint,
  optional,
  className,
  ...input
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </label>
      <textarea id={id} rows={3} className={clsx("input", error && "input-error")} aria-invalid={!!error} {...input} />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  className,
  children,
  ...select
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </label>
      <select id={id} className={clsx("input pr-9", error && "input-error")} aria-invalid={!!error} {...select}>
        {children}
      </select>
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function FileField({
  label,
  error,
  hint,
  optional,
  className,
  file,
  onFile,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
}: BaseProps & { file: File | null; onFile: (f: File | null) => void; accept?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <span className="label">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </span>
      <label
        htmlFor={id}
        className={clsx(
          "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-sm transition hover:border-brand-400 hover:bg-brand-50/40",
          error ? "border-brand-400 bg-brand-50/40" : file ? "border-care-500 bg-care-50/50" : "border-slate-300 bg-white",
        )}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-ink-soft">
          {file ? (file.type === "application/pdf" ? "PDF" : "IMG") : "+"}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{file ? file.name : "Choose a file or take a photo"}</span>
          <span className="block text-xs text-ink-muted">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to change` : "PDF, JPG or PNG · up to 8 MB"}
          </span>
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  className = "btn-primary",
  ...rest
}: { pending: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Small helper for async form submissions with field-level errors from the API. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    setError(null);
    setFields({});
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFields(e.fields);
      } else {
        setError("We couldn't reach the server. Check your connection and try again.");
      }
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, error, fields, run, setError };
}
