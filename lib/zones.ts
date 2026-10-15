import type { ExposureMode, Mode, PresetZoneId, Zone, ZoneRegion } from "./types";

/** The five zones required by R2.1. Order matters: it drives the UI. */
export const CORE_ZONE_IDS = ["riphah_johar", "gulberg", "mall_road", "dha", "shahdara"] as const;

/** City-wide extension beyond R2.1 (kept from the v1 app). */
export const EXTENDED_ZONE_IDS = [
  "model_town",
  "iqbal_town",
  "cantt",
  "bahria",
  "walled_city",
  "faisal_town",
  "garden_town",
  "wapda_town",
  "badami_bagh",
  "thokar",
  "askari",
  "quaid_industrial",
] as const;

export const ZONES: Record<PresetZoneId, Zone> = {
  // Core (R2.1)
  riphah_johar: { id: "riphah_johar", label: "Johar Town / Riphah Campus", region: "West & Educational", lat: 31.4697, lon: 74.2728, core: true },
  gulberg: { id: "gulberg", label: "Gulberg / Kalma Chowk", region: "Central & Commercial", lat: 31.5204, lon: 74.3587, core: true },
  mall_road: { id: "mall_road", label: "Mall Road / Civil Lines", region: "Central & Commercial", lat: 31.558, lon: 74.3292, core: true },
  dha: { id: "dha", label: "DHA Phase 5", region: "East & Cantonment", lat: 31.472, lon: 74.411, core: true },
  shahdara: { id: "shahdara", label: "Shahdara Industrial", region: "North & Industrial", lat: 31.6215, lon: 74.2825, core: true },
  // Extended
  model_town: { id: "model_town", label: "Model Town / Central Park", region: "South & Suburbs", lat: 31.4883, lon: 74.3204 },
  iqbal_town: { id: "iqbal_town", label: "Allama Iqbal Town / Wahdat Road", region: "West & Educational", lat: 31.5126, lon: 74.2801 },
  cantt: { id: "cantt", label: "Lahore Cantt / Saddar Bazaar", region: "East & Cantonment", lat: 31.5367, lon: 74.3804 },
  bahria: { id: "bahria", label: "Bahria Town / Raiwind Road", region: "South & Suburbs", lat: 31.3686, lon: 74.1837 },
  walled_city: { id: "walled_city", label: "Walled City / Anarkali / Mozang", region: "Central & Commercial", lat: 31.5725, lon: 74.3095 },
  faisal_town: { id: "faisal_town", label: "Faisal Town / Township", region: "West & Educational", lat: 31.4642, lon: 74.3015 },
  garden_town: { id: "garden_town", label: "Garden Town / Barkat Market", region: "Central & Commercial", lat: 31.5032, lon: 74.3262 },
  wapda_town: { id: "wapda_town", label: "WAPDA Town / Valencia / Lake City", region: "South & Suburbs", lat: 31.4332, lon: 74.2588 },
  badami_bagh: { id: "badami_bagh", label: "Badami Bagh / Ravi Road", region: "North & Industrial", lat: 31.5976, lon: 74.3168 },
  thokar: { id: "thokar", label: "Thokar Niaz Baig / Canal Road", region: "West & Educational", lat: 31.4746, lon: 74.2415 },
  askari: { id: "askari", label: "Askari 10 & 11 / Ring Road", region: "East & Cantonment", lat: 31.529, lon: 74.4255 },
  quaid_industrial: { id: "quaid_industrial", label: "Quaid-e-Azam Industrial Estate", region: "North & Industrial", lat: 31.4475, lon: 74.324 },
};

export const ALL_ZONE_IDS = [...CORE_ZONE_IDS, ...EXTENDED_ZONE_IDS] as const;

export const ZONE_REGIONS: ZoneRegion[] = [
  "West & Educational",
  "Central & Commercial",
  "East & Cantonment",
  "North & Industrial",
  "South & Suburbs",
];

/**
 * Bounding box for accepting GPS coordinates. Generous enough to cover greater
 * Lahore and its outskirts; anything outside is rejected so the model is never
 * asked to advise on, say, Karachi using Lahore-specific prompts.
 */
export const LAHORE_BOUNDS = { minLat: 31.2, maxLat: 31.8, minLon: 74.0, maxLon: 74.6 } as const;

export function isWithinLahore(lat: number, lon: number): boolean {
  return (
    lat >= LAHORE_BOUNDS.minLat &&
    lat <= LAHORE_BOUNDS.maxLat &&
    lon >= LAHORE_BOUNDS.minLon &&
    lon <= LAHORE_BOUNDS.maxLon
  );
}

/** Nearest predefined zone, used to label a GPS fix ("near Gulberg"). */
export function nearestZone(lat: number, lon: number): Zone {
  let best = ZONES.riphah_johar;
  let bestDist = Infinity;
  for (const z of Object.values(ZONES)) {
    const d = (z.lat - lat) ** 2 + (z.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best;
}

export const MODES: Record<ExposureMode, Mode> = {
  bike: {
    id: "bike",
    label: "Motorbike / Yango / Bykea rider (open-air intake)",
    shortLabel: "Motorbike",
    description: "Open-air, heavy intake",
    multiplier: 1.8,
    icon: "Bike",
  },
  walk: {
    id: "walk",
    label: "Outdoor pedestrian / runner",
    shortLabel: "Walk / Run",
    description: "Elevated breathing rate",
    multiplier: 1.5,
    icon: "Footprints",
  },
  car: {
    id: "car",
    label: "Sealed vehicle with cabin recirculation",
    shortLabel: "Car",
    description: "Recirculated cabin air",
    multiplier: 0.6,
    icon: "Car",
  },
  elder_asthma: {
    id: "elder_asthma",
    label: "Sensitive group (elderly / asthma) – vulnerability weight",
    shortLabel: "Elderly / Asthma",
    description: "Higher vulnerability",
    multiplier: 2.0,
    icon: "ShieldAlert",
  },
};

export const MODE_IDS = ["bike", "walk", "car", "elder_asthma"] as const satisfies readonly ExposureMode[];
