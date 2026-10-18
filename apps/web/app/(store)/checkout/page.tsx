import type { Metadata } from "next";
import { apiGet, getUser } from "@/lib/server-api";
import type { Address, Prescription, StoreInfo } from "@/lib/types";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getUser();
  const [info, addresses, prescriptions] = await Promise.all([
    apiGet<StoreInfo>("/store-info"),
    user ? apiGet<{ addresses: Address[] }>("/account/addresses") : null,
    user ? apiGet<{ prescriptions: Prescription[] }>("/prescriptions") : null,
  ]);
  return (
    <CheckoutForm
      user={user}
      info={info!}
      addresses={addresses?.addresses ?? []}
      prescriptions={(prescriptions?.prescriptions ?? []).filter((p) => p.status !== "REJECTED" && !p.expired)}
    />
  );
}
