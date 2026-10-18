import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, type Permission, type User } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ServerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Server-side GET against the API, forwarding the visitor's session cookie. Returns null on 404. */
export async function apiGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieStore.toString(), accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ServerApiError(res.status, body.error ?? `API error ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getUser(): Promise<User | null> {
  try {
    const data = await apiGet<{ user: User | null }>("/auth/me");
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.mustChangePassword) redirect(`/change-password?next=${encodeURIComponent(next)}`);
  return user;
}

/** Where a signed-in user should land by default, based on what their role can do. */
export function homeFor(user: User) {
  if (can(user, "dashboard.view")) return "/admin";
  if (can(user, "deliveries.ride")) return "/rider";
  return "/account";
}

export async function requireStaff() {
  const user = await requireUser("/admin");
  if (!can(user, "dashboard.view")) redirect(homeFor(user));
  return user;
}

/** Guards an admin page; staff without the permission are sent back to the dashboard with a notice. */
export async function requirePermission(permission: Permission) {
  const user = await requireStaff();
  if (!can(user, permission)) redirect("/admin?denied=1");
  return user;
}

export async function requireRider() {
  const user = await requireUser("/rider");
  if (!can(user, "deliveries.ride")) redirect(homeFor(user));
  return user;
}
