"use client";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

type Options = { method?: string; json?: unknown; form?: FormData };

/** Browser-side API call through the /api rewrite. Throws ApiError with per-field messages on validation errors. */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.json || opts.form ? "POST" : "GET"),
    credentials: "include",
    headers: opts.json ? { "content-type": "application/json" } : undefined,
    body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
  if (!res.ok) throw new ApiError(res.status, body.error ?? "Something went wrong. Please try again.", body.fields ?? {});
  return body as T;
}
