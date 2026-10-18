import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <InfoPage current="/terms" title="Terms of service" updated="15 October 2026" intro={`These terms apply when you use ${site.name}'s website or place an order with us.`}>
      <h2>1. About us</h2>
      <p>
        {site.name} is a registered pharmacy premises ({site.pcnPremisesNumber}) at {site.address.line1}, {site.address.line2}, {site.address.city},{" "}
        {site.address.country}. Our superintendent pharmacist is {site.superintendent}.
      </p>
      <h2>2. Your account</h2>
      <p>
        You must be 18 or over to create an account. Keep your password private. You're responsible for orders placed from your account. The
        information you give us, especially about prescriptions and identity, must be true and accurate.
      </p>
      <h2>3. Orders and prices</h2>
      <ul>
        <li>Prices are in Nigerian Naira and include VAT where applicable. Delivery fees are shown before you pay.</li>
        <li>An order is accepted when we confirm payment (or, for pay-at-pickup orders, when we start preparing it).</li>
        <li>If a price was displayed in error, we'll contact you before processing and you may cancel for a full refund.</li>
      </ul>
      <h2>4. Prescription and controlled medicines</h2>
      <p>
        Prescription-only medicines are supplied only after a pharmacist approves a valid prescription. Controlled medicines also require
        identity verification. Our pharmacists may decline to supply any medicine where, in their professional judgement, it would be unsafe or
        unlawful. If we decline, you won't be charged. See <Link href="/prescriptions">how prescriptions work</Link>.
      </p>
      <h2>5. Payment</h2>
      <p>
        Card and USSD payments are processed by Paystack. Bank-transfer orders that remain unpaid after 48 hours are cancelled automatically
        and the stock released.
      </p>
      <h2>6. Delivery, cancellation and returns</h2>
      <p>
        Delivery is described on our <Link href="/delivery">delivery page</Link>. You may cancel before dispatch for a full refund. Returns and
        refunds are covered by our <Link href="/returns">returns policy</Link>, which doesn't affect your rights under the Federal Competition and
        Consumer Protection Act 2018.
      </p>
      <h2>7. Health information on this site</h2>
      <p>
        Product information is for general guidance and doesn't replace advice from a doctor or pharmacist. Always read the patient leaflet.
        In an emergency, go to the nearest hospital.
      </p>
      <h2>8. Liability</h2>
      <p>
        We take reasonable care in everything we do. Nothing in these terms limits liability that cannot be limited by Nigerian law, including
        for death or personal injury caused by negligence.
      </p>
      <h2>9. Changes and governing law</h2>
      <p>
        We may update these terms, and the version in force when you order applies to that order. These terms are governed by the laws of the
        Federal Republic of Nigeria.
      </p>
    </InfoPage>
  );
}
