export const ROLES = ["CUSTOMER", "ADMIN", "PHARMACIST", "SUPPORT", "INVENTORY", "RIDER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage", // status changes, payment confirmation, dispatch, refunds, cancellations
  "prescriptions.review",
  "verifications.review",
  "products.manage",
  "inventory.manage",
  "customers.view",
  "messages.view",
  "staff.manage",
  "deliveries.ride",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Single source of truth for what each role may do. Enforced by the API; the web app only uses it to hide links. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  PHARMACIST: ["dashboard.view", "orders.view", "orders.manage", "prescriptions.review", "verifications.review", "products.manage", "inventory.manage", "customers.view", "messages.view"],
  SUPPORT: ["dashboard.view", "orders.view", "orders.manage", "customers.view", "messages.view"],
  INVENTORY: ["dashboard.view", "products.manage", "inventory.manage"],
  RIDER: ["deliveries.ride"],
  CUSTOMER: [],
};

export const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  ADMIN: { label: "Administrator", description: "Full access, including managing staff accounts and roles." },
  PHARMACIST: { label: "Pharmacist", description: "Reviews prescriptions and IDs, manages orders, products and stock." },
  SUPPORT: { label: "Customer support", description: "Handles orders, payments, dispatch, customers and messages. Cannot review prescriptions or edit products." },
  INVENTORY: { label: "Inventory manager", description: "Manages products, stock batches and expiry. No access to orders or customer data." },
  RIDER: { label: "Delivery rider", description: "Uses the rider app to deliver assigned orders and share live location." },
  CUSTOMER: { label: "Customer", description: "Shops and manages their own orders and prescriptions." },
};

export const permissionsFor = (role: Role) => ROLE_PERMISSIONS[role] ?? [];
export const can = (role: Role | undefined, p: Permission) => !!role && permissionsFor(role).includes(p);

export const RX_STATUS = ["OTC", "POM", "CONTROLLED"] as const;
export type RxStatus = (typeof RX_STATUS)[number];

export const ORDER_STATUS = [
  "AWAITING_RX_REVIEW", // prescription items waiting for a pharmacist
  "AWAITING_PAYMENT", // ready to be paid
  "PROCESSING", // paid (or pay-on-pickup confirmed), being packed
  "READY_FOR_PICKUP",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED", // picked up
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

/** Statuses from which the customer may still cancel (nothing has left the pharmacy yet). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["AWAITING_RX_REVIEW", "AWAITING_PAYMENT", "PROCESSING"];

/** Allowed staff transitions. */
export const STAFF_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_RX_REVIEW: ["CANCELLED"],
  AWAITING_PAYMENT: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "DISPATCHED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_METHODS = ["PAYSTACK", "BANK_TRANSFER", "PAY_ON_PICKUP"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const FREE_DELIVERY_THRESHOLD_KOBO = 50_000_00;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
