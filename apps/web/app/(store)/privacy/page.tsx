import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <InfoPage
      current="/privacy"
      title="Privacy policy"
      updated="15 October 2026"
      intro="Your health information is sensitive. This policy explains, in plain language, what we collect, why, and the choices you have. It follows the Nigeria Data Protection Act 2023 (NDPA)."
    >
      <h2>Who we are</h2>
      <p>
        {site.name} ({site.address.line1}, {site.address.city}) is the data controller for information collected through this website. Contact
        our data protection lead at <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account and contact details:</strong> name, email, phone number and delivery addresses.</li>
        <li><strong>Health information:</strong> prescriptions you upload, and notes you send our pharmacists.</li>
        <li><strong>Identity documents:</strong> only if you verify your account to buy controlled medicines.</li>
        <li><strong>Orders and payments:</strong> what you bought, payment references and delivery records. We never see or store your full card details; card payments are handled by Paystack.</li>
        <li><strong>Technical data:</strong> IP address and browser information, used to keep the site secure.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To process, dispense and deliver your orders safely (contract and legal obligation).</li>
        <li>To review prescriptions and keep dispensing records required by PCN and NAFDAC (legal obligation).</li>
        <li>To send order updates by email, SMS or WhatsApp (contract).</li>
        <li>To send health tips and offers, only if you opt in (consent, withdraw any time).</li>
      </ul>
      <p><strong>We never use prescription or health information for marketing, and we never sell your data.</strong></p>
      <h2>Who we share it with</h2>
      <ul>
        <li>Delivery partners: your name, phone and address only.</li>
        <li>Paystack: to process payments.</li>
        <li>Your prescriber or hospital: only to verify a prescription when needed.</li>
        <li>Regulators (PCN, NAFDAC, NDLEA): only where the law requires it.</li>
      </ul>
      <h2>How long we keep it</h2>
      <table>
        <tbody>
          <tr><td>Prescription and dispensing records</td><td>5 years</td></tr>
          <tr><td>Financial and order records</td><td>7 years</td></tr>
          <tr><td>Inactive accounts</td><td>Deleted after 3 years without activity</td></tr>
        </tbody>
      </table>
      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, export or delete your data, object to processing, or withdraw consent, subject to records we must keep
        by law. Email <a href={`mailto:${site.email}`}>{site.email}</a> and we'll respond within 30 days. You can also complain to the Nigeria
        Data Protection Commission.
      </p>
      <h2>Security</h2>
      <p>
        Data is sent over encrypted connections (HTTPS), uploaded documents are stored privately and only accessible to authorised staff, and
        passwords are stored as one-way hashes.
      </p>
    </InfoPage>
  );
}
