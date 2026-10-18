"use client";

import { useState } from "react";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import { LeafletMap, type LatLng } from "./leaflet-map";

/** Optional delivery pin at checkout: tap the map, drag the pin, or use the phone's location. */
export function LocationPicker({ value, onChange, fallbackCenter }: { value: LatLng | null; onChange: (p: LatLng | null) => void; fallbackCenter: LatLng }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return setError("Your browser can't share its location. Tap the map instead.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setError("We couldn't get your location. Check location permissions, or tap the map to drop a pin.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-soft">
          <MapPin className="mr-1 inline h-4 w-4 text-brand-600" aria-hidden />
          Pin your exact location <span className="font-normal text-ink-muted">(optional, helps our rider find you)</span>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Crosshair className="h-3.5 w-3.5" aria-hidden />}
            Use my current location
          </button>
          {value && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>
              <X className="h-3.5 w-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>
      </div>
      <LeafletMap
        className="h-64"
        pickable
        ariaLabel="Map to choose your delivery location. Tap to drop a pin."
        markers={value ? [{ id: "home", kind: "home", position: value, label: "Deliver here" }] : [{ id: "center", kind: "me", position: fallbackCenter }]}
        fitKey={value ? `${value.lat.toFixed(3)},${value.lng.toFixed(3)}` : "fallback"}
        onPick={onChange}
      />
      <p className="text-xs text-ink-muted">
        {value ? "Pin set. Drag it to adjust." : "Tap the map where you want the delivery, or use your current location."}
        {error && <span className="block font-medium text-brand-700">{error}</span>}
      </p>
    </div>
  );
}
