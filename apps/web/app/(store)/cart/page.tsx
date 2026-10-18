import type { Metadata } from "next";
import { apiGet, getUser } from "@/lib/server-api";
import type { StoreInfo } from "@/lib/types";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const [user, info] = await Promise.all([getUser(), apiGet<StoreInfo>("/store-info")]);
  return <CartView user={user} info={info!} />;
}
