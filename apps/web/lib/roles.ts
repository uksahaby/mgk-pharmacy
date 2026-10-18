import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  PHARMACIST: "Pharmacist",
  SUPPORT: "Customer support",
  INVENTORY: "Inventory manager",
  RIDER: "Delivery rider",
  CUSTOMER: "Customer",
};

export const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-brand-100 text-brand-800",
  PHARMACIST: "bg-care-100 text-care-700",
  SUPPORT: "bg-sky-100 text-sky-800",
  INVENTORY: "bg-amber-100 text-amber-800",
  RIDER: "bg-indigo-100 text-indigo-800",
  CUSTOMER: "bg-slate-100 text-slate-700",
};
