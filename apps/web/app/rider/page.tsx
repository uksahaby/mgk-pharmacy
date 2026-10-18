import { apiGet } from "@/lib/server-api";
import { RiderDeliveries, type RiderData } from "./rider-deliveries";

export default async function RiderHome() {
  const data = (await apiGet<RiderData>("/rider/deliveries"))!;
  return <RiderDeliveries data={data} />;
}
