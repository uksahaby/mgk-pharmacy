"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };
export type MapMarker = { id: string; position: LatLng; kind: "store" | "home" | "rider" | "me"; label?: string; heading?: number | null };

const ICON_HTML: Record<MapMarker["kind"], (m: MapMarker) => string> = {
  store: () =>
    `<div class="mgk-pin mgk-pin-store" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" fill="#fff"/></svg></div>`,
  home: () =>
    `<div class="mgk-pin mgk-pin-home" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></div>`,
  rider: (m) =>
    `<div class="mgk-rider" aria-hidden="true"><span class="mgk-rider-pulse"></span><div class="mgk-rider-dot" style="transform: rotate(${m.heading ?? 0}deg)"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3 19 20 12 16 5 20z" fill="#fff"/></svg></div></div>`,
  me: () => `<div class="mgk-me" aria-hidden="true"></div>`,
};

/**
 * Thin imperative wrapper around Leaflet + OpenStreetMap tiles.
 * Markers and lines are updated in place so the map doesn't flicker while a rider moves.
 */
export function LeafletMap({
  markers,
  trail,
  guide,
  fitKey,
  className = "h-80",
  onPick,
  pickable,
  ariaLabel,
}: {
  markers: MapMarker[];
  /** Path already travelled. */
  trail?: [number, number][];
  /** Dashed line, e.g. rider → destination. */
  guide?: [number, number][];
  /** Change this value to re-fit the map to all markers (e.g. when a delivery starts). */
  fitKey?: string;
  className?: string;
  onPick?: (p: LatLng) => void;
  pickable?: boolean;
  ariaLabel: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layers = useRef<{ markers: Map<string, Leaflet.Marker>; trail?: Leaflet.Polyline; guide?: Leaflet.Polyline }>({ markers: new Map() });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const lastFit = useRef<string | undefined>(undefined);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(m);
      m.setView([12.0, 8.55], 13);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.current = m;
      setTimeout(() => m.invalidateSize(), 50);
      render();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layers.current = { markers: new Map() };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function render() {
    const m = map.current;
    const leaflet = L.current;
    if (!m || !leaflet) return;
    const store = layers.current;

    // markers: update in place, add new, remove stale
    const seen = new Set<string>();
    for (const mk of markers) {
      seen.add(mk.id);
      const icon = leaflet.divIcon({ html: ICON_HTML[mk.kind](mk), className: "", iconSize: [36, 36], iconAnchor: [18, mk.kind === "rider" || mk.kind === "me" ? 18 : 34] });
      const existing = store.markers.get(mk.id);
      if (existing) {
        existing.setLatLng([mk.position.lat, mk.position.lng]);
        existing.setIcon(icon);
      } else {
        const marker = leaflet.marker([mk.position.lat, mk.position.lng], {
          icon,
          draggable: pickable && mk.kind === "home",
          keyboard: false,
          zIndexOffset: mk.kind === "rider" ? 1000 : 0,
        });
        if (mk.label) marker.bindTooltip(mk.label, { direction: "top", offset: [0, -30] });
        if (pickable && mk.kind === "home") marker.on("dragend", () => {
          const p = marker.getLatLng();
          onPickRef.current?.({ lat: p.lat, lng: p.lng });
        });
        marker.addTo(m);
        store.markers.set(mk.id, marker);
      }
    }
    for (const [id, marker] of store.markers) {
      if (!seen.has(id)) {
        marker.remove();
        store.markers.delete(id);
      }
    }

    if (trail && trail.length > 1) {
      if (store.trail) store.trail.setLatLngs(trail);
      else store.trail = leaflet.polyline(trail, { color: "#d71f33", weight: 5, opacity: 0.85, lineCap: "round" }).addTo(m);
    } else if (store.trail) {
      store.trail.remove();
      store.trail = undefined;
    }
    if (guide && guide.length > 1) {
      if (store.guide) store.guide.setLatLngs(guide);
      else store.guide = leaflet.polyline(guide, { color: "#0f172a", weight: 3, opacity: 0.5, dashArray: "6 8" }).addTo(m);
    } else if (store.guide) {
      store.guide.remove();
      store.guide = undefined;
    }

    if (fitKey !== lastFit.current && markers.length) {
      lastFit.current = fitKey;
      const bounds = leaflet.latLngBounds(markers.map((mk) => [mk.position.lat, mk.position.lng] as [number, number]));
      if (markers.length === 1) m.setView(bounds.getCenter(), 16);
      else m.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    }
  }

  useEffect(render);

  return <div ref={el} className={`relative z-0 w-full overflow-hidden rounded-2xl bg-slate-100 ${className}`} role="application" aria-label={ariaLabel} />;
}
