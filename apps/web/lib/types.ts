export type RxStatus = "OTC" | "POM" | "CONTROLLED";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  verificationStatus: "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";
  permissions: Permission[];
  mustChangePassword: boolean;
};

export type Role = "CUSTOMER" | "ADMIN" | "PHARMACIST" | "SUPPORT" | "INVENTORY" | "RIDER";
export type Permission =
  | "dashboard.view"
  | "orders.view"
  | "orders.manage"
  | "prescriptions.review"
  | "verifications.review"
  | "products.manage"
  | "inventory.manage"
  | "customers.view"
  | "messages.view"
  | "staff.manage"
  | "deliveries.ride";

/** UI convenience only; the API enforces every permission. */
export const can = (user: Pick<User, "permissions"> | null | undefined, p: Permission) => !!user?.permissions?.includes(p);

export type Category = { slug: string; name: string; description: string; icon: string; productCount: number };

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  genericName: string;
  brand: string;
  strength: string | null;
  dosageForm: string;
  packSize: string;
  priceKobo: number;
  compareAtKobo: number | null;
  rxStatus: RxStatus;
  coldChain: boolean;
  featured: boolean;
  category?: { slug: string; name: string; icon: string };
  inStock: boolean;
  lowStock: boolean;
};

export type ProductDetail = ProductSummary & {
  manufacturer: string | null;
  description: string;
  usage: string;
  warnings: string;
  storage: string;
  stockAvailable: number;
  nextExpiry: string | null;
};

export type ProductList = { products: ProductSummary[]; total: number; page: number; pageSize: number; pageCount: number };

export type Zone = { code: string; name: string; description: string; feeKobo: number; etaLabel: string };

export type StoreInfo = {
  states: string[];
  zones: Zone[];
  freeDeliveryThresholdKobo: number;
  paymentMethods: { paystack: boolean; bankTransfer: boolean; payOnPickup: boolean };
  bank: { name: string; accountName: string; accountNumber: string };
  unpaidOrderTtlHours: number;
  store: { lat: number; lng: number };
};

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  packSize: string;
  rxStatus: RxStatus;
  coldChain: boolean;
  categoryIcon: string;
  priceKobo: number;
  quantity: number;
  available: number;
  lineTotalKobo: number;
  issue?: string;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalKobo: number;
  shippingKobo: number;
  totalKobo: number;
  zone: { id: string; name: string; etaLabel: string; feeKobo: number } | null;
  freeDelivery: boolean;
  freeDeliveryThresholdKobo: number;
  amountToFreeDeliveryKobo: number;
  requiresRx: boolean;
  requiresVerification: boolean;
  hasColdChain: boolean;
  canCheckout: boolean;
};

export type OrderStatus =
  | "AWAITING_RX_REVIEW"
  | "AWAITING_PAYMENT"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PROOF_SUBMITTED" | "PAID" | "REFUND_PENDING" | "REFUNDED";

export type Order = {
  number: string;
  accessKey: string;
  status: OrderStatus;
  paymentMethod: "PAYSTACK" | "BANK_TRANSFER" | "PAY_ON_PICKUP";
  paymentStatus: PaymentStatus;
  paymentRef: string | null;
  hasProof: boolean;
  fulfilment: "DELIVERY" | "PICKUP";
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { line1: string | null; line2: string | null; city: string | null; state: string | null; landmark: string | null } | null;
  zone: { name: string; etaLabel: string } | null;
  items: {
    productId: string;
    slug?: string;
    icon: string;
    name: string;
    packSize: string;
    rxStatus: RxStatus;
    priceKobo: number;
    quantity: number;
  }[];
  subtotalKobo: number;
  shippingKobo: number;
  totalKobo: number;
  notes: string | null;
  requiresRx: boolean;
  prescription: { id: string; status: string; reviewerNote: string | null; originalName: string } | null;
  events: { type: string; message: string; createdAt: string; actor?: string }[];
  canCancel: boolean;
  canPayOnline: boolean;
  bankDetails: { name: string; accountName: string; accountNumber: string } | null;
  payBy: string | null;
  delivery: {
    destination: { lat: number; lng: number; source: string | null } | null;
    rider: { firstName: string; phone: string | null; id?: string; lastName?: string } | null;
    code: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    live: boolean;
  } | null;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
};

export type Tracking = {
  status: OrderStatus;
  live: boolean;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
  destinationSource: string | null;
  rider: { firstName: string; phone: string | null } | null;
  position: { lat: number; lng: number; heading: number | null; at: string } | null;
  trail: [number, number][];
  etaMinutes: number | null;
  stale: boolean;
  dispatchedAt: string | null;
  deliveredAt: string | null;
};

export type Prescription = {
  id: string;
  patientName: string;
  prescriberName: string | null;
  facility: string | null;
  issuedOn: string | null;
  originalName: string;
  mimeType: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote: string | null;
  reviewedAt: string | null;
  validUntil: string | null;
  expired: boolean;
  createdAt: string;
};

export type Verification = {
  id: string;
  type: "PATIENT" | "DOCTOR" | "PHARMACIST";
  idType: string;
  licenseNumber: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  landmark: string | null;
  isDefault: boolean;
};
