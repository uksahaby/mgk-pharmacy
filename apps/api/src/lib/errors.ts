import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

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
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join("."), i.message])),
    });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 8 MB)." : err.message;
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong on our side. Please try again." });
}
