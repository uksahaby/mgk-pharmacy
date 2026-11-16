import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import multer from "multer";

// Zod 4's default messages are written for developers ("Invalid input: expected string, received undefined").
// Keep plain wording for the fields customers see; schemas that set their own message are unaffected.
z.config({
  customError: (iss) => {
    if (iss.code === "invalid_type" && iss.input === undefined) return "Required";
    if (iss.code === "too_small" && iss.origin === "string") return Number(iss.minimum) <= 1 ? "Required" : `Must be at least ${iss.minimum} characters`;
    if (iss.code === "too_big" && iss.origin === "string") return `Must be at most ${iss.maximum} characters`;
    if (iss.code === "invalid_format" && iss.format === "email") return "Enter a valid email address";
    return undefined;
  },
});

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);
export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details);
export const forbidden = (message = "You do not have access to this resource") => new HttpError(403, message);

/** Wraps async route handlers so rejected promises reach the error middleware. */
export const ah =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Please check the highlighted fields.",
      // One message per field: the first problem found (reversed so it wins over later ones).
      fields: Object.fromEntries([...err.issues].reverse().map((i) => [i.path.join("."), i.message])),
    });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 8 MB)." : err.message;
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Body-parser rejections (over the size limit, or malformed JSON) are the client's problem, not a server fault.
  const type = (err as { type?: string } | null)?.type;
  if (type === "entity.too.large") return res.status(413).json({ error: "That request is too large." });
  if (type === "entity.parse.failed") return res.status(400).json({ error: "The request couldn't be read. Please try again." });
  console.error(err);
  return res.status(500).json({ error: "Something went wrong on our side. Please try again." });
}
