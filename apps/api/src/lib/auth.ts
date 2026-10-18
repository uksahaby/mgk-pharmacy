import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./prisma";
import { HttpError, forbidden } from "./errors";
import { can, permissionsFor, type Permission, type Role } from "./constants";

export const SESSION_COOKIE = "mgk_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  verificationStatus: string;
  permissions: Permission[];
  mustChangePassword: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Starts a session. The token carries the user's sessionVersion; bumping it in the database signs them out everywhere.
 * Browsers get it as an httpOnly cookie. The mobile app (which sends `X-Client: mobile`) also receives it in the
 * response body so it can keep it in the device's secure storage and send it as a Bearer token. It is never exposed
 * to website JavaScript.
 */
export function setSession(res: Response, user: Pick<User, "id" | "sessionVersion">, req?: Request) {
  const token = jwt.sign({ sub: user.id, sv: user.sessionVersion }, env.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return isMobileClient(req) ? token : undefined;
}

export const isMobileClient = (req?: Request) => req?.header("x-client") === "mobile";

function tokenFrom(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.[SESSION_COOKIE];
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export const publicUser = (u: User): SessionUser => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone,
  role: u.role as Role,
  verificationStatus: u.verificationStatus,
  permissions: permissionsFor(u.role as Role),
  mustChangePassword: u.mustChangePassword,
});

/** Resolves the session cookie (if any) into req.user. Never rejects the request. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = tokenFrom(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; sv?: number };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Deactivated accounts and sessions issued before a role change or password reset are ignored.
    if (user && user.active && (payload.sv ?? 0) === user.sessionVersion) req.user = publicUser(user);
  } catch {
    // invalid or expired token: treat as signed out
  }
  next();
}

const PASSWORD_CHANGE_ALLOWED = new Set(["/auth/me", "/auth/change-password", "/auth/logout"]);

/** Accounts created or reset by an admin must set their own password before doing anything else. */
export function enforcePasswordChange(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(req.path)) {
    return next(new HttpError(403, "Please set a new password before continuing.", { code: "PASSWORD_CHANGE_REQUIRED" }));
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

export const requirePermission =
  (...perms: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
    if (!perms.some((p) => can(req.user!.role, p))) return next(forbidden("Your role doesn't allow this. Ask an administrator if you need access."));
    next();
  };

/** Staff who may see any customer's orders. */
export const isStaff = (user?: SessionUser) => can(user?.role, "orders.view");
