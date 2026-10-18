import type { Metadata } from "next";
import { apiGet } from "@/lib/server-api";
import type { StoreInfo } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { site } from "@/lib/site";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Delivery & pickup", description: "Delivery prices and times across Nigeria, and free in-store pickup in Kano." };

export default async function DeliveryPage() {
  const info = await apiGet<StoreInfo>("/store-info");
  return (
    <InfoPage current="/delivery" title="Delivery & pickup" intro="Simple, transparent delivery prices. No hidden fees, and free delivery on larger orders.">
      <h2>Delivery prices</h2>
      <table>
        <thead>
          <tr>
            <th>Area</th>
            <th>Delivery time</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {info?.zones.map((z) => (
            <tr key={z.code}>
              <td>
                <strong>{z.name}</strong>
                <br />
                <span className="text-xs">{z.description}</span>
              </td>
              <td>{z.etaLabel}</td>
              <td>{formatNaira(z.feeKobo)}</td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>Pickup in store</strong>
              <br />
              <span className="text-xs">{site.address.line1}, {site.address.city}</span>
            </td>
            <td>Usually within 1 hour</td>
            <td>Free</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Free delivery</strong> anywhere in Nigeria on orders over {formatNaira(info?.freeDeliveryThresholdKobo ?? 5_000_000)}.
      </p>
      <h2>When will my order arrive?</h2>
      <p>
        Delivery times start once your order is paid (and, for prescription items, once a pharmacist has approved your prescription). Orders
        paid before 3pm in Kano usually arrive the same day. Times are estimates and can be affected by public holidays and weather.
      </p>
      <h2>Refrigerated medicines</h2>
      <p>
        Insulin and other cold-chain items are packed in insulated cool boxes with ice packs. Outside Kano we recommend ordering early in
        the week so they don't wait in transit over a weekend.
      </p>
      <h2>Receiving your order</h2>
      <ul>
        <li>Our rider will call the phone number on your order when they arrive.</li>
        <li>Please check that the seal on your package is intact before accepting it.</li>
        <li>Controlled medicines must be received by the patient or an adult with ID.</li>
      </ul>
    </InfoPage>
  );
}
