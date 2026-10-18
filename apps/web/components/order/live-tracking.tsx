"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bike, Clock, KeyRound, MapPin, Phone, WifiOff } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatPhone } from "@/lib/format";
import type { Tracking } from "@/lib/types";
import { LeafletMap, type MapMarker } from "@/components/map/leaflet-map";

const POLL_MS = 4000;

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 10 ? "just now" : s < 60 ? `${s} seconds ago` : `${Math.round(s / 60)} min ago`;
}

/** Live rider map shown on the order page while a delivery is on its way. */
export function LiveTracking({
  number,
  accessKey,
  code,
  staff,
}: {
  number: string;
  accessKey?: string;
  code?: string | null;
  staff?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    const qs = accessKey ? `?key=${encodeURIComponent(accessKey)}` : "";
    const load = async () => {
      try {
        const t = await api<Tracking>(`/orders/${number}/tracking${qs}`);
        if (stop) return;
        setData(t);
        setError(false);
        // Delivery finished (or was cancelled): refresh the page once so this card is replaced.
        if (t.status !== "DISPATCHED" && !statusRef.current) {
          statusRef.current = t.status;
          router.refresh();
        }
      } catch {
        if (!stop) setError(true);
      }
    };
    void load();
    const poll = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [number, accessKey, router]);

  const markers: MapMarker[] = [];
  if (data) {
    markers.push({ id: "store", kind: "store", position: data.origin, label: "MGK Pharmacy" });
    if (data.destination) markers.push({ id: "home", kind: "home", position: data.destination, label: "Delivery address" });
    if (data.position) markers.push({ id: "rider", kind: "rider", position: data.position, heading: data.position.heading, label: data.rider?.firstName ?? "Rider" });
  }
  const guide: [number, number][] | undefined =
    data?.position && data.destination ? [[data.position.lat, data.position.lng], [data.destination.lat, data.destination.lng]] : undefined;

  return (
    <section className="card overflow-hidden" aria-labelledby="live-h">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-care-50 text-care-600">
            <Bike className="h-5 w-5" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-care-500 ring-2 ring-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-care-500" />
            </span>
          </span>
          <div>
            <h2 id="live-h" className="text-lg font-semibold">
              {staff ? "Live delivery" : "Your order is on its way"}
            </h2>
            <p className="text-sm text-ink-muted">
              {data?.rider ? `${data.rider.firstName} is bringing your order` : "Rider assigned"}
              {data?.position && <> · updated {ago(data.position.at, now)}</>}
            </p>
          </div>
        </div>
        {data?.etaMinutes != null && (
          <div className="rounded-xl bg-ink px-4 py-2 text-white" aria-live="polite">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Arriving in about</p>
            <p className="font-display text-2xl font-bold leading-tight">{data.etaMinutes} min</p>
          </div>
        )}
      </div>

      <div className="relative">
        <LeafletMap
          className="h-[340px] sm:h-[420px] !rounded-none"
          ariaLabel="Map showing the rider's live location and your delivery address"
          markers={markers}
          trail={data?.trail}
          guide={guide}
          fitKey={data ? `${!!data.position}-${!!data.destination}` : undefined}
        />
        {data && data.live && !data.position && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] rounded-xl bg-white/95 p-3 text-sm shadow-lift">
            <Clock className="mr-1.5 inline h-4 w-4 text-amber-600" aria-hidden />
            Waiting for the rider's location. It appears here as soon as they set off.
          </div>
        )}
        {data?.stale && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] rounded-xl bg-white/95 p-3 text-sm shadow-lift">
            <WifiOff className="mr-1.5 inline h-4 w-4 text-orange-600" aria-hidden />
            The rider's phone hasn't updated for a moment (weak signal). Showing the last known position.
          </div>
        )}
        {error && !data && <p className="absolute inset-0 grid place-items-center text-sm text-ink-muted">Couldn't load the live map. Retrying…</p>}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        {code && !staff && (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 sm:col-span-1">
            <KeyRound className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <div>
              <p className="text-xs text-ink-muted">Delivery code</p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-ink">{code}</p>
              <p className="text-[11px] text-ink-muted">Give it to the rider only when you have your package.</p>
            </div>
          </div>
        )}
        {staff && code && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <KeyRound className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden /> Delivery code: <strong className="font-mono">{code}</strong>
          </div>
        )}
        {data?.rider?.phone && (
          <a href={`tel:${data.rider.phone}`} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
            <Phone className="h-5 w-5 shrink-0 text-care-600" aria-hidden />
            <span>
              <span className="block font-semibold">Call {data.rider.firstName}</span>
              <span className="text-ink-muted">{formatPhone(data.rider.phone)}</span>
            </span>
          </a>
        )}
        {data?.destinationSource && data.destinationSource !== "PIN" && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your pin is approximate (from your {data.destinationSource === "CITY" ? "town" : "address"}). The rider will call if they need directions.
          </p>
        )}
      </div>
    </section>
  );
}
