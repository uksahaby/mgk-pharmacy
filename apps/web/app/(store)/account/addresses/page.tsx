import type { Metadata } from "next";
import { apiGet } from "@/lib/server-api";
import type { Address, StoreInfo } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { AddressBook } from "./address-book";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const [data, info] = await Promise.all([apiGet<{ addresses: Address[] }>("/account/addresses"), apiGet<StoreInfo>("/store-info")]);
  return (
    <div className="space-y-6">
      <PageHeader title="Addresses" subtitle="Saved addresses appear at checkout so you never retype them." />
      <AddressBook addresses={data?.addresses ?? []} states={info?.states ?? []} />
    </div>
  );
}
