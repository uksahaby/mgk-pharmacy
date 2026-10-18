import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Frequently asked questions" };

const FAQS: { section: string; items: [string, React.ReactNode][] }[] = [
  {
    section: "Ordering",
    items: [
      ["Do I need an account to order?", "No, you can check out as a guest for everyday products. You'll need an account to order prescription medicines, so we can keep your prescriptions safe and linked to you."],
      ["How do I know your medicines are genuine?", "We buy only from NAFDAC-registered manufacturers and licensed distributors, and record the batch number and expiry date of everything we sell. You'll never receive an item with less than a few months of shelf life."],
      ["Can I cancel my order?", <>Yes, from your order page, any time before it's dispatched or ready for pickup. If you've paid, you get a full refund. See <Link href="/returns">returns & refunds</Link>.</>],
      ["Can I order for someone else?", "Yes. Enter their delivery address at checkout. For prescription medicines, the prescription must be in the patient's name."],
    ],
  },
  {
    section: "Prescriptions",
    items: [
      ["Which medicines need a prescription?", "Products marked “Rx only” are prescription-only medicines, including antibiotics, blood pressure and diabetes medicines. Products marked “Controlled” also need identity verification."],
      ["How long does the review take?", "Usually within 2 working hours during opening times. You'll get an email as soon as it's approved, and you only pay after approval."],
      ["Can I reuse a prescription?", "Yes. Approved prescriptions are saved to your account until they expire (normally 6 months), so repeat orders are faster."],
      ["Will you substitute a different brand?", "Never without asking. If your prescribed brand is out of stock we'll contact you; substitutions need your agreement and, where required, your prescriber's approval."],
    ],
  },
  {
    section: "Payment & delivery",
    items: [
      ["How can I pay?", "By card, bank app or USSD through Paystack, by bank transfer, or in store when you pick up your order."],
      ["I paid by bank transfer. What now?", "Use your order number as the transfer reference, then upload your receipt on your order page. We confirm transfers within about an hour during opening times."],
      ["How much is delivery?", <>It depends on your state, from ₦1,000 in Kano. Delivery is free on orders over ₦50,000, and pickup in store is always free. See <Link href="/delivery">delivery & pickup</Link>.</>],
    ],
  },
  {
    section: "Privacy",
    items: [
      ["Who can see my prescription and health information?", "Only our pharmacists and the staff who need it to fulfil your order. We never use health information for marketing. Read our privacy policy for details."],
      ["How long do you keep my data?", "Prescription records are kept for 5 years and financial records for 7 years, as the law requires. Inactive accounts are deleted after 3 years."],
    ],
  },
];

export default function FaqPage() {
  return (
    <InfoPage current="/faq" title="Frequently asked questions" intro="Quick answers to the questions we hear most. Can't find yours? Ask a pharmacist on WhatsApp.">
      {FAQS.map((s) => (
        <section key={s.section} className="not-prose">
          <h2 className="mb-3 mt-8 text-xl font-semibold text-ink first:mt-0">{s.section}</h2>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {s.items.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  {q}
                  <span className="text-xl leading-none text-ink-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="mt-2 text-[15px] leading-7 text-ink-soft [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline">{a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </InfoPage>
  );
}
