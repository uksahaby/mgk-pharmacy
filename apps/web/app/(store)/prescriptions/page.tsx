import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "How prescriptions work",
  description: "Upload a prescription, get it reviewed by a pharmacist, and receive your medicines. Here's how it works.",
};

export default function PrescriptionsInfoPage() {
  return (
    <InfoPage
      current="/prescriptions"
      title="How prescriptions work"
      intro="Some medicines can only be supplied against a valid prescription. Here's exactly what happens when you order one from us."
    >
      <h2>1. Add your medicines to the cart</h2>
      <p>
        Prescription-only medicines are marked <strong>Rx only</strong>. You can add them to your cart like any other product. You'll need
        to be signed in to check out.
      </p>
      <h2>2. Attach your prescription</h2>
      <p>
        At checkout, upload a clear photo or PDF of your prescription, or choose one you've uploaded before. A valid prescription shows:
      </p>
      <ul>
        <li>the patient's full name (and age for children)</li>
        <li>the medicine name, strength, dose and duration</li>
        <li>the prescriber's name, signature and the hospital or clinic</li>
        <li>the date it was written (generally within the last 6 months)</li>
      </ul>
      <h2>3. A pharmacist reviews it</h2>
      <p>
        A registered pharmacist checks your prescription, usually within 2 working hours during opening times. If anything is unclear we'll
        call or message you. We never substitute a different brand or medicine without your prescriber's approval and your agreement.
      </p>
      <h2>4. Pay and receive</h2>
      <p>
        You only pay once your prescription is approved, so you never pay for something we can't dispense. We then pack and seal your
        order for delivery or pickup.
      </p>
      <h2>Repeat prescriptions</h2>
      <p>
        Approved prescriptions are saved in your account until they expire, so repeat orders for long-term conditions such as high blood
        pressure or diabetes can be processed straight away.
      </p>
      <h2>Controlled medicines</h2>
      <p>
        Some medicines (for example strong painkillers and some sedatives) are controlled by law. For these we also need to{" "}
        <Link href="/account/verification">verify your identity</Link> once. It takes about two minutes.
      </p>
      <p>
        <Link href="/account/prescriptions">Upload a prescription now</Link>
      </p>
    </InfoPage>
  );
}
