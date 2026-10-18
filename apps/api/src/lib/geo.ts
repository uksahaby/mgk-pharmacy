import { env } from "./env";

export type LatLng = { lat: number; lng: number };

/** Rough bounding box for Nigeria, used to reject obviously wrong coordinates. */
export const inNigeria = (p: LatLng) => p.lat >= 4 && p.lat <= 14.1 && p.lng >= 2.6 && p.lng <= 14.7;

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Arrival estimate for a motorbike rider in city traffic: straight-line distance × 1.35 road factor at ~22 km/h,
 * or the rider's own recent speed when they're clearly moving.
 */
export function etaMinutes(from: LatLng, to: LatLng, speedMps?: number | null) {
  const roadMeters = distanceMeters(from, to) * 1.35;
  const mps = speedMps && speedMps > 2 && speedMps < 25 ? speedMps : 22_000 / 3600;
  return Math.max(1, Math.round(roadMeters / mps / 60));
}

/** State capitals, used as a last-resort map position when an address can't be geocoded. */
const STATE_CENTRES: Record<string, LatLng> = {
  Kano: { lat: 12.0022, lng: 8.592 },
  Kaduna: { lat: 10.5105, lng: 7.4165 },
  "FCT - Abuja": { lat: 9.0765, lng: 7.3986 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Katsina: { lat: 12.9908, lng: 7.6018 },
  Jigawa: { lat: 11.7562, lng: 9.3389 },
  Bauchi: { lat: 10.3158, lng: 9.8442 },
  Rivers: { lat: 4.8156, lng: 7.0498 },
  Oyo: { lat: 7.3775, lng: 3.947 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  Plateau: { lat: 9.8965, lng: 8.8583 },
  Sokoto: { lat: 13.0059, lng: 5.2476 },
  Zamfara: { lat: 12.1704, lng: 6.6641 },
  Kebbi: { lat: 12.4539, lng: 4.1975 },
  Niger: { lat: 9.6139, lng: 6.5569 },
  Gombe: { lat: 10.2897, lng: 11.1673 },
  Borno: { lat: 11.8311, lng: 13.151 },
  Yobe: { lat: 11.747, lng: 11.9608 },
  Adamawa: { lat: 9.2035, lng: 12.4954 },
  Kwara: { lat: 8.4966, lng: 4.5421 },
  Nasarawa: { lat: 8.4939, lng: 8.5152 },
  Benue: { lat: 7.7337, lng: 8.5214 },
  Kogi: { lat: 7.8023, lng: 6.7333 },
};

const cache = new Map<string, LatLng | null>();
let lastCall = 0;

/**
 * Looks up an address with OpenStreetMap Nominatim (free; max 1 request/second, identifying User-Agent required).
 * For production volumes, point GEOCODER_URL at a commercial geocoder or a self-hosted Nominatim.
 */
export async function geocode(parts: { line1?: string | null; city?: string | null; state?: string | null }): Promise<{ point: LatLng; source: "GEOCODED" | "CITY" } | null> {
  const queries = [
    [parts.line1, parts.city, parts.state, "Nigeria"],
    [parts.city, parts.state, "Nigeria"],
  ].map((q) => q.filter(Boolean).join(", "));

  for (const [i, q] of queries.entries()) {
    if (!q) continue;
    let hit = cache.get(q);
    if (hit === undefined) {
      hit = null;
      try {
        const wait = 1100 - (Date.now() - lastCall);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastCall = Date.now();
        const res = await fetch(`${env.geocoderUrl}?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(q)}`, {
          headers: { "User-Agent": `MGK-Pharmacy-Delivery/1.0 (${env.webOrigin})`, "Accept-Language": "en" },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const [first] = (await res.json()) as { lat: string; lon: string }[];
          if (first) hit = { lat: Number(first.lat), lng: Number(first.lon) };
        }
      } catch {
        // network or rate-limit problem: fall through to the next, coarser query
      }
      cache.set(q, hit);
    }
    if (hit && inNigeria(hit)) return { point: hit, source: i === 0 ? "GEOCODED" : "CITY" };
  }
  const centre = parts.state ? STATE_CENTRES[parts.state] : undefined;
  return centre ? { point: centre, source: "CITY" } : null;
}

export const storeLocation = (): LatLng => ({ lat: env.store.lat, lng: env.store.lng });
