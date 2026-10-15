// Resolves a validated request to a concrete location (preset zone or GPS fix).
import { nearestZone, ZONES } from "./zones";
import type { Coords, PresetZoneId } from "./types";
import type { SmogRequestInput } from "./schemas";

export interface ResolvedLocation {
  coords: Coords;
  label: string;
}

/** GPS coords are rounded to ~100 m before use so precise positions are never forwarded or echoed. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveLocation(req: SmogRequestInput): ResolvedLocation {
  if (req.zone === "custom_gps" && req.customCoords) {
    const coords = { lat: roundCoord(req.customCoords.lat), lon: roundCoord(req.customCoords.lon) };
    return { coords, label: `Live location near ${nearestZone(coords.lat, coords.lon).label}` };
  }
  const zone = ZONES[req.zone as PresetZoneId];
  return { coords: { lat: zone.lat, lon: zone.lon }, label: zone.label };
}
