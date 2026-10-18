"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, IdCard, MapPin, Navigation, Phone, PlayCircle, Radio, StopCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { useSubmit } from "@/components/form";
import { Alert, EmptyState } from "@/components/ui";
import { LeafletMap, type LatLng, type MapMarker } from "@/components/map/leaflet-map";

type Delivery = {
  number: string;
  status: "DISPATCHED" | "DELIVERED";
  customer: { firstName: string; lastName: string; phone: string };
  address: { line1: string | null; line2: string | null; city: string | null; state: string | null; landmark: string | null };
  destination: { lat: number; lng: number; source: string | null } | null;
  itemCount: number;
  requiresId: boolean;
  notes: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  lastPing: string | null;
};
export type RiderData = { store: LatLng; deliveries: Delivery[]; canSimulate: boolean };

export function RiderDeliveries({ data }: { data: RiderData }) {
  const router = useRouter();
  // Pick up newly assigned deliveries without the rider having to reload.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  const active = data.deliveries.filter((d) => d.status === "DISPATCHED");
  const done = data.deliveries.filter((d) => d.status === "DELIVERED");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Your deliveries</h1>
      {active.length === 0 ? (
        <EmptyState icon={<Navigation className="h-7 w-7" />} title="No deliveries right now">
          New deliveries appear here automatically when the pharmacy sends them out to you.
        </EmptyState>
      ) : (
        active.map((d) => <DeliveryCard key={d.number} d={d} store={data.store} canSimulate={data.canSimulate} />)
      )}
      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">Delivered today</h2>
          <ul className="space-y-2">
            {done.map((d) => (
              <li key={d.number} className="card flex items-center justify-between p-4 text-sm">
                <span>
                  <span className="font-semibold">{d.number}</span>
                  <span className="block text-ink-muted">{d.customer.firstName} · {d.address.city}</span>
                </span>
                <span className="flex items-center gap-1.5 text-care-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {d.deliveredAt ? formatDateTime(d.deliveredAt) : "Delivered"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DeliveryCard({ d, store, canSimulate }: { d: Delivery; store: LatLng; canSimulate: boolean }) {
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [me, setMe] = useState<(LatLng & { heading: number | null }) | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [simulating, setSimulating] = useState(false);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const { pending, error, run } = useSubmit();

  const stopSharing = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    void wakeLock.current?.release().catch(() => null);
    wakeLock.current = null;
    setSharing(false);
  };

  const startSharing = async () => {
    if (!("geolocation" in navigator)) return setGpsError("This phone can't share location from the browser.");
    setGpsError(null);
    setSharing(true);
    // Keep the screen awake so location keeps flowing while riding (supported on most Android browsers).
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      // not supported: location still works while the page is open
    }
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
          accuracy: pos.coords.accuracy,
        };
        setMe({ lat: point.lat, lng: point.lng, heading: point.heading });
        const res = await api<{ ok: boolean; stopSharing?: boolean }>(`/rider/deliveries/${d.number}/location`, { json: point }).catch(() => null);
        if (res?.stopSharing) stopSharing();
      },
      (err) => {
        setGpsError(err.code === err.PERMISSION_DENIED ? "Location permission was denied. Allow location for this site in your browser settings." : "Waiting for GPS signal…");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20_000 },
    );
  };

  useEffect(() => () => stopSharing(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const dest = d.destination;
  const markers: MapMarker[] = [{ id: "store", kind: "store", position: store, label: "Pharmacy" }];
  if (dest) markers.push({ id: "home", kind: "home", position: dest, label: d.customer.firstName });
  if (me) markers.push({ id: "me", kind: "rider", position: me, heading: me.heading, label: "You" });

  const directions = dest
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.address.line1, d.address.city, d.address.state, "Nigeria"].filter(Boolean).join(", "))}`;

  return (
    <article className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{d.number}</p>
          <p className="text-lg font-bold">{d.customer.firstName} {d.customer.lastName}</p>
          <p className="text-sm text-ink-soft">
            {d.address.line1}
            {d.address.line2 ? `, ${d.address.line2}` : ""}, {d.address.city}
          </p>
          {d.address.landmark && <p className="text-sm text-ink-muted">Landmark: {d.address.landmark}</p>}
          <p className="mt-1 text-xs text-ink-muted">{d.itemCount} item{d.itemCount === 1 ? "" : "s"}</p>
        </div>
        <span className={clsx("chip", sharing ? "bg-care-100 text-care-700" : "bg-slate-100 text-ink-soft")}>
          <Radio className="h-3 w-3" aria-hidden /> {sharing ? "Live" : "Not sharing"}
        </span>
      </div>

      {d.requiresId && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
          <IdCard className="h-4 w-4 shrink-0" aria-hidden /> Contains a controlled medicine. Check the recipient's ID.
        </div>
      )}
      {d.notes && <p className="mx-4 mb-3 rounded-xl bg-amber-50 p-3 text-sm">Customer note: {d.notes}</p>}

      <LeafletMap className="h-56 !rounded-none" ariaLabel={`Map to ${d.customer.firstName}'s address`} markers={markers} fitKey={`${!!me}-${!!dest}`} />
      {dest?.source && dest.source !== "PIN" && (
        <p className="flex items-center gap-1.5 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> Approximate location. Call the customer for directions.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 p-4">
        <a href={`tel:${d.customer.phone}`} className="btn-outline">
          <Phone className="h-4 w-4" aria-hidden /> Call customer
        </a>
        <a href={directions} target="_blank" rel="noreferrer" className="btn-outline">
          <Navigation className="h-4 w-4" aria-hidden /> Directions
        </a>
        {sharing ? (
          <button className="btn-dark col-span-2" onClick={stopSharing}>
            <StopCircle className="h-4 w-4" aria-hidden /> Stop sharing location
          </button>
        ) : (
          <button className="btn-care col-span-2 btn-lg" onClick={startSharing}>
            <PlayCircle className="h-5 w-5" aria-hidden /> Start trip: share my location
          </button>
        )}
        {gpsError && <p className="col-span-2 text-sm text-orange-700">{gpsError}</p>}
        {canSimulate && (
          <button
            className="btn-ghost btn-sm col-span-2 text-ink-muted"
            disabled={simulating}
            onClick={async () => {
              setSimulating(true);
              await api(`/rider/deliveries/${d.number}/simulate`, { method: "POST" }).catch(() => null);
            }}
          >
            {simulating ? "Simulated drive running (about 90 seconds)…" : "Demo only: simulate this drive"}
          </button>
        )}
      </div>

      <form
        className="space-y-2 border-t border-slate-100 bg-slate-50 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(() => api(`/rider/deliveries/${d.number}/delivered`, { json: { code } }));
          if (ok) {
            stopSharing();
            router.refresh();
          }
        }}
      >
        <label htmlFor={`code-${d.number}`} className="label">Delivered? Enter the customer's 4-digit code</label>
        <div className="flex gap-2">
          <input
            id={`code-${d.number}`}
            className="input text-center font-mono text-xl tracking-[0.4em]"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoComplete="one-time-code"
          />
          <button className="btn-primary shrink-0" disabled={pending || code.length !== 4}>
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Confirm
          </button>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
      </form>
    </article>
  );
}
