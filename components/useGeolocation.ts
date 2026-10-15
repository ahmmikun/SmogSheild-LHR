"use client";

import { useCallback, useState } from "react";
import { isWithinLahore, nearestZone } from "@/lib/zones";
import type { Coords } from "@/lib/types";

export type GeoState =
  | { status: "off" }
  | { status: "locating" }
  | { status: "on"; coords: Coords; nearLabel: string }
  | { status: "error"; message: string };

/** Browser Geolocation → Lahore-bounded coordinates. Never sent anywhere until a run. */
export function useGeolocation(onFix?: (coords: Coords) => void) {
  const [state, setState] = useState<GeoState>({ status: "off" });

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "error", message: "Your browser doesn't support location. Pick a zone instead." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (!isWithinLahore(coords.lat, coords.lon)) {
          setState({ status: "error", message: "You appear to be outside Lahore. Pick a zone instead." });
          return;
        }
        setState({ status: "on", coords, nearLabel: nearestZone(coords.lat, coords.lon).label });
        onFix?.(coords);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Allow it in your browser, or pick a zone."
            : "Couldn't get your location. Pick a zone instead.";
        setState({ status: "error", message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [onFix]);

  const turnOff = useCallback(() => setState({ status: "off" }), []);

  return { geo: state, locate, turnOff };
}
