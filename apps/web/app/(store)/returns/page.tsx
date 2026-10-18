import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Returns & refunds", description: "When you can return an item, how refunds work and how long they take." };

export default function ReturnsPage() {
  return (
    <InfoPage
      current="/returns"
      title="Returns & refunds"
      updated="15 October 2026"
      intro="For your safety, medicines can't be resold once they've left the pharmacy. But if we get something wrong, we'll put it right quickly."
    >
      <h2>Cancelling an order</h2>
      <p>
        You can cancel any order yourself from your order page, free of charge, at any time <strong>before it's dispatched or ready for
        pickup</strong>. If you've already paid, you get a full refund.
      </p>
      <h2>Returns: within 48 hours of delivery</h2>
      <p>Contact us within 48 hours of receiving your order if:</p>
      <ul>
        <li>you received the wrong item, strength or quantity</li>
        <li>the packaging or seal was damaged or broken on arrival</li>
        <li>an item was expired or close to expiry when delivered</li>
        <li>the product has been recalled by NAFDAC (no time limit)</li>
      </ul>
      <p>We'll offer a replacement or a full refund, and collect the item at no cost to you.</p>
      <h2>Items we can't take back</h2>
      <ul>
        <li>prescription medicines that were dispensed correctly</li>
        <li>refrigerated items (for example insulin and vaccines), unless faulty on arrival</li>
        <li>opened or partly used products, unless faulty</li>
      </ul>
      <h2>How long refunds take</h2>
      <table>
        <thead>
          <tr>
            <th>You paid by</th>
            <th>Refund time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Card or USSD (Paystack)</td>
            <td>3–5 working days, back to the same card or account</td>
          </tr>
          <tr>
            <td>Bank transfer</td>
            <td>1–2 working days, to the account you paid from</td>
          </tr>
          <tr>
            <td>Pay at pickup</td>
            <td>Immediately in store, or by transfer within 1–2 working days</td>
          </tr>
        </tbody>
      </table>
      <h2>If an item is out of stock after you pay</h2>
      <p>
        We'll contact you straight away. You can wait for restock, accept an alternative your prescriber approves, or take a full refund
        within 24 hours.
      </p>
      <p>
        To start a return, <Link href="/contact">contact us</Link> with your order number.
      </p>
    </InfoPage>
  );
}
