"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Building2, CreditCard, FileText, Lock, MapPin, Store, Truck, Wallet } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useQuote } from "@/components/cart/use-quote";
import { FileField, SelectField, SubmitButton, TextArea, TextField, useSubmit } from "@/components/form";
import { Alert, EmptyState } from "@/components/ui";
import { ProductArt } from "@/components/product-art";
import { ReviewPill, RxBadge } from "@/components/badges";
import { LocationPicker } from "@/components/map/location-picker";
import { api } from "@/lib/client-api";
import { formatDate, formatNaira, formatPhone } from "@/lib/format";
import { site } from "@/lib/site";
import type { Address, Prescription, StoreInfo, User } from "@/lib/types";

type Fulfilment = "DELIVERY" | "PICKUP";
type PayMethod = "PAYSTACK" | "BANK_TRANSFER" | "PAY_ON_PICKUP";

export function CheckoutForm({
  user,
  info,
  addresses,
  prescriptions,
}: {
  user: User | null;
  info: StoreInfo;
  addresses: Address[];
  prescriptions: Prescription[];
}) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const [contact, setContact] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: formatPhone(user?.phone),
  });
  const [fulfilment, setFulfilment] = useState<Fulfilment>("DELIVERY");
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Kano", landmark: "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [rxChoice, setRxChoice] = useState<string>(prescriptions[0]?.id ?? "new");
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxPatient, setRxPatient] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [rxPrescriber, setRxPrescriber] = useState("");
  const [payment, setPayment] = useState<PayMethod>(info.paymentMethods.paystack ? "PAYSTACK" : "BANK_TRANSFER");
  const [notes, setNotes] = useState("");
  const [agree, setAgree] = useState(false);
  const { pending, error, fields, run, setError } = useSubmit();

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const deliveryState = fulfilment === "DELIVERY" ? (selectedAddress?.state ?? address.state) : null;
  const { quote } = useQuote(fulfilment, deliveryState);

  useEffect(() => {
    if (fulfilment === "DELIVERY" && payment === "PAY_ON_PICKUP") setPayment(info.paymentMethods.paystack ? "PAYSTACK" : "BANK_TRANSFER");
  }, [fulfilment, payment, info.paymentMethods.paystack]);

  const rxNeedsReview = useMemo(() => {
    if (!quote?.requiresRx) return false;
    const chosen = prescriptions.find((p) => p.id === rxChoice);
    return !chosen || chosen.status !== "APPROVED";
  }, [quote, prescriptions, rxChoice]);

  if (ready && items.length === 0) {
    return (
      <div className="container max-w-3xl py-16">
        <EmptyState icon={<Wallet className="h-7 w-7" />} title="Nothing to check out yet" action={<Link href="/shop" className="btn-primary">Browse products</Link>}>
          Your cart is empty.
        </EmptyState>
      </div>
    );
  }

  const blockedByVerification = quote?.requiresVerification && user?.verificationStatus !== "APPROVED";
  const blockedBySignIn = quote?.requiresRx && !user;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quote?.requiresRx && rxChoice === "new" && !rxFile) {
      setError("Please attach a photo or PDF of your prescription.");
      return;
    }
    if (!agree) {
      setError("Please confirm you agree to the terms of service.");
      return;
    }
    await run(async () => {
      let prescriptionId: string | undefined;
      if (quote?.requiresRx) {
        if (rxChoice === "new" && rxFile) {
          const fd = new FormData();
          fd.set("file", rxFile);
          fd.set("patientName", rxPatient);
          if (rxPrescriber) fd.set("prescriberName", rxPrescriber);
          const res = await api<{ prescription: Prescription }>("/prescriptions", { form: fd });
          prescriptionId = res.prescription.id;
        } else {
          prescriptionId = rxChoice;
        }
      }
      const deliveryAddress =
        fulfilment === "DELIVERY"
          ? {
              ...(selectedAddress
                ? { line1: selectedAddress.line1, line2: selectedAddress.line2 ?? "", city: selectedAddress.city, state: selectedAddress.state, landmark: selectedAddress.landmark ?? "" }
                : address),
              ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
            }
          : undefined;
      const res = await api<{ number: string; accessKey: string; paymentUrl: string | null; paymentError: string | null }>("/orders", {
        json: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          fulfilment,
          contact,
          address: deliveryAddress,
          paymentMethod: payment,
          prescriptionId,
          notes: notes || undefined,
          saveAddress: !!user && fulfilment === "DELIVERY" && !selectedAddress && saveAddress,
        },
      });
      clear();
      if (res.paymentUrl) window.location.href = res.paymentUrl;
      else router.push(`/order/${res.number}?key=${res.accessKey}&new=1${res.paymentError ? "&payfail=1" : ""}`);
    });
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Checkout</h1>
      {!user && (
        <p className="mt-2 text-ink-muted">
          Checking out as a guest.{" "}
          <Link href="/login?next=/checkout" className="font-semibold text-ink underline">
            Sign in
          </Link>{" "}
          for saved addresses and order history.
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {error && <Alert tone="error" title="We couldn't place your order">{error}</Alert>}
          {blockedBySignIn && (
            <Alert tone="warning" title="Sign in to order prescription medicines">
              We need to link prescriptions to an account for your safety.{" "}
              <Link href="/login?next=/checkout" className="font-semibold underline">Sign in or create an account</Link>.
            </Alert>
          )}
          {blockedByVerification && (
            <Alert tone="warning" title="Identity verification needed">
              Your cart contains a controlled medicine. {user?.verificationStatus === "PENDING" ? "Your verification is being reviewed, and we'll email you once it's approved." : <><Link href="/account/verification" className="font-semibold underline">Verify your identity</Link> (about 2 minutes), then come back to checkout.</>}
            </Alert>
          )}

          <Step n={1} title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="First name" autoComplete="given-name" required value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} error={fields["contact.firstName"]} />
              <TextField label="Last name" autoComplete="family-name" required value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} error={fields["contact.lastName"]} />
              <TextField label="Email" type="email" autoComplete="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={fields["contact.email"]} hint="We'll send your receipt and order updates here." />
              <TextField label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" required placeholder="0803 123 4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} error={fields["contact.phone"]} hint="For delivery and WhatsApp updates." />
            </div>
          </Step>

          <Step n={2} title="Delivery or pickup">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Fulfilment method">
              <ChoiceCard checked={fulfilment === "DELIVERY"} onSelect={() => setFulfilment("DELIVERY")} icon={<Truck className="h-5 w-5" />} title="Home delivery" subtitle={quote?.zone ? `${quote.zone.etaLabel} · ${quote.shippingKobo === 0 ? "Free" : formatNaira(quote.shippingKobo)}` : "Across Nigeria"} />
              <ChoiceCard checked={fulfilment === "PICKUP"} onSelect={() => setFulfilment("PICKUP")} icon={<Store className="h-5 w-5" />} title="Pick up in store" subtitle="Free · Ready in about 1 hour" />
            </div>

            {fulfilment === "DELIVERY" ? (
              <div className="mt-5 space-y-4">
                {addresses.length > 0 && (
                  <div className="space-y-2" role="radiogroup" aria-label="Delivery address">
                    {addresses.map((a) => (
                      <label key={a.id} className={clsx("flex cursor-pointer gap-3 rounded-xl border p-3.5 text-sm transition", addressId === a.id ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
                        <input type="radio" name="address" className="mt-1 accent-brand-600" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span>
                          <span className="font-semibold">{a.label}</span> · {a.fullName}
                          <span className="block text-ink-muted">
                            {a.line1}
                            {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state}
                          </span>
                        </span>
                      </label>
                    ))}
                    <label className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm", addressId === "new" ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200")}>
                      <input type="radio" name="address" className="accent-brand-600" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                      <span className="font-semibold">Use a new address</span>
                    </label>
                  </div>
                )}
                {addressId === "new" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField className="sm:col-span-2" label="Street address" autoComplete="address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} error={fields["address.line1"]} placeholder="House number and street" />
                    <TextField className="sm:col-span-2" label="Apartment, estate or area" optional autoComplete="address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                    <TextField label="Town / city" autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} error={fields["address.city"]} />
                    <SelectField label="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} error={fields["address.state"]}>
                      {info.states.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectField>
                    <TextField className="sm:col-span-2" label="Nearest landmark" optional value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} hint="Helps our rider find you, e.g. “opposite Zoo Road mosque”." />
                    {user && (
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account
                      </label>
                    )}
                  </div>
                )}
                <LocationPicker value={pin} onChange={setPin} fallbackCenter={info.store} />
                {quote?.hasColdChain && (
                  <p className="text-sm text-sky-800">Refrigerated items are packed in insulated cool boxes. Outside Kano we recommend express delivery or pickup.</p>
                )}
              </div>
            ) : (
              <div className="mt-5 flex gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <div>
                  <p className="font-semibold">{site.name}</p>
                  <p className="text-ink-muted">
                    {site.address.line1}, {site.address.line2}, {site.address.city}
                  </p>
                  <p className="mt-1 text-ink-muted">{site.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</p>
                  <p className="mt-1 text-ink-muted">We'll message you when it's ready. Bring your order number.</p>
                </div>
              </div>
            )}
          </Step>

          {quote?.requiresRx && user && (
            <Step n={3} title="Prescription" icon={<FileText className="h-4 w-4" />}>
              <p className="-mt-1 mb-4 text-sm text-ink-muted">
                Needed for: {quote.lines.filter((l) => l.rxStatus !== "OTC").map((l) => l.name).join(", ")}.
              </p>
              <div className="space-y-2" role="radiogroup" aria-label="Prescription">
                {prescriptions.map((p) => (
                  <label key={p.id} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm", rxChoice === p.id ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
                    <input type="radio" name="rx" className="accent-brand-600" checked={rxChoice === p.id} onChange={() => setRxChoice(p.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.patientName}</span>
                      {p.prescriberName ? ` · ${p.prescriberName}` : ""}
                      <span className="block truncate text-ink-muted">
                        Uploaded {formatDate(p.createdAt)}
                        {p.validUntil ? ` · valid until ${formatDate(p.validUntil)}` : ""}
                      </span>
                    </span>
                    <ReviewPill status={p.status} />
                  </label>
                ))}
                <label className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm", rxChoice === "new" ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200")}>
                  <input type="radio" name="rx" className="accent-brand-600" checked={rxChoice === "new"} onChange={() => setRxChoice("new")} />
                  <span className="font-semibold">Upload a new prescription</span>
                </label>
              </div>
              {rxChoice === "new" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FileField className="sm:col-span-2" label="Prescription" file={rxFile} onFile={setRxFile} hint="A clear photo or scan showing the patient's name, the medicine, dose, prescriber's signature and date." />
                  <TextField label="Patient's full name" value={rxPatient} onChange={(e) => setRxPatient(e.target.value)} error={fields.patientName} />
                  <TextField label="Prescriber / hospital" optional value={rxPrescriber} onChange={(e) => setRxPrescriber(e.target.value)} />
                </div>
              )}
              {rxNeedsReview && (
                <Alert tone="info" className="mt-4" title="You'll pay after approval">
                  A pharmacist reviews your prescription, usually within 2 working hours. We'll email you, then you can pay with the method below.
                </Alert>
              )}
            </Step>
          )}

          <Step n={quote?.requiresRx && user ? 4 : 3} title="Payment">
            <div className="space-y-2" role="radiogroup" aria-label="Payment method">
              {info.paymentMethods.paystack && (
                <ChoiceRow checked={payment === "PAYSTACK"} onSelect={() => setPayment("PAYSTACK")} icon={<CreditCard className="h-5 w-5" />} title="Card, bank or USSD" subtitle="Instant confirmation via Paystack. Visa, Mastercard, Verve, bank apps and USSD." />
              )}
              <ChoiceRow
                checked={payment === "BANK_TRANSFER"}
                onSelect={() => setPayment("BANK_TRANSFER")}
                icon={<Building2 className="h-5 w-5" />}
                title="Bank transfer"
                subtitle={`Transfer to ${info.bank.accountName} (${info.bank.name}) and upload your receipt. Unpaid orders are released after ${info.unpaidOrderTtlHours} hours.`}
              />
              {fulfilment === "PICKUP" && (
                <ChoiceRow checked={payment === "PAY_ON_PICKUP"} onSelect={() => setPayment("PAY_ON_PICKUP")} icon={<Store className="h-5 w-5" />} title="Pay at pickup" subtitle="Pay by card, transfer or cash when you collect." />
              )}
            </div>
            {!info.paymentMethods.paystack && (
              <p className="mt-3 text-xs text-ink-muted">Card payments are temporarily unavailable.</p>
            )}
          </Step>

          <div className="card p-5 sm:p-6">
            <TextArea label="Order notes" optional value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, or anything our pharmacist should know" />
            <label className="mt-5 flex items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                I agree to the <Link href="/terms" className="font-medium underline" target="_blank">terms of service</Link> and{" "}
                <Link href="/privacy" className="font-medium underline" target="_blank">privacy policy</Link>, and confirm the information I've given is accurate.
              </span>
            </label>
          </div>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">Your order</h2>
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => {
                const line = quote?.lines.find((l) => l.productId === i.productId);
                return (
                  <li key={i.productId} className="flex items-center gap-3">
                    <div className="relative w-14 shrink-0 overflow-hidden rounded-lg">
                      <ProductArt name={i.snapshot.name} icon={i.snapshot.icon} size="sm" />
                      <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-ink px-1 text-[11px] font-bold text-white">{i.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium">{i.snapshot.name} {i.snapshot.strength}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs text-ink-muted">{i.snapshot.packSize}</span>
                        <RxBadge status={i.snapshot.rxStatus} className="!py-0 !text-[10px]" />
                      </div>
                      {line?.issue && <p className="text-xs font-medium text-brand-700">{line.issue}</p>}
                    </div>
                    <p className="text-sm font-semibold">{formatNaira((line?.priceKobo ?? i.snapshot.priceKobo) * i.quantity)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd>{quote ? formatNaira(quote.subtotalKobo) : "…"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{fulfilment === "PICKUP" ? "Pickup" : `Delivery${quote?.zone ? ` (${quote.zone.name})` : ""}`}</dt>
                <dd>{quote ? (quote.shippingKobo === 0 ? "Free" : formatNaira(quote.shippingKobo)) : "…"}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{quote ? formatNaira(quote.totalKobo) : "…"}</dd>
              </div>
            </dl>
            <SubmitButton pending={pending} className="btn-primary btn-lg mt-5 w-full" disabled={!quote || !!blockedBySignIn || !!blockedByVerification || quote.lines.some((l) => l.issue)}>
              <Lock className="h-4 w-4" aria-hidden />
              {rxNeedsReview ? "Submit for pharmacist review" : payment === "PAYSTACK" ? "Continue to secure payment" : "Place order"}
            </SubmitButton>
            <p className="mt-3 text-center text-xs text-ink-muted">You can cancel free of charge any time before your order is dispatched.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Step({ n, title, icon, children }: { n: number; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        {title}
        {icon && <span className="text-ink-muted">{icon}</span>}
      </h2>
      {children}
    </section>
  );
}

function ChoiceCard({ checked, onSelect, icon, title, subtitle }: { checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={clsx("flex items-start gap-3 rounded-xl border p-4 text-left transition", checked ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
      <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-lg", checked ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft")}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function ChoiceRow({ checked, onSelect, icon, title, subtitle }: { checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={clsx("flex w-full items-center gap-4 rounded-xl border p-4 text-left transition", checked ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
      <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", checked ? "border-brand-600" : "border-slate-300")}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
      </span>
      <span className="text-ink-soft">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-muted">{subtitle}</span>
      </span>
    </button>
  );
}

