// Shared domain types (design.md "Data Models"), extended with the city-wide
// zone list and live-GPS location support.
import type { AiProvider } from "./config";
import type { CORE_ZONE_IDS, EXTENDED_ZONE_IDS } from "./zones";

export type PresetZoneId = (typeof CORE_ZONE_IDS)[number] | (typeof EXTENDED_ZONE_IDS)[number];
/** `custom_gps` = coordinates supplied by the browser's Geolocation API. */
export type ZoneId = PresetZoneId | "custom_gps";
export type ExposureMode = "bike" | "walk" | "car" | "elder_asthma";
export type RiskBand = "GOOD" | "MODERATE" | "USG" | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS";

export type ZoneRegion =
  | "West & Educational"
  | "Central & Commercial"
  | "East & Cantonment"
  | "North & Industrial"
  | "South & Suburbs"
  | "Live Location";

export interface Zone {
  id: ZoneId;
  label: string;
  region: ZoneRegion;
  lat: number;
  lon: number;
  /** true for the five zones mandated by R2.1 */
  core?: boolean;
}

export interface Mode {
  id: ExposureMode;
  label: string;
  shortLabel: string;
  description: string;
  multiplier: number;
  icon: "Bike" | "Footprints" | "Car" | "ShieldAlert";
}

export interface Coords {
  lat: number;
  lon: number;
}

export interface SmogRequest {
  zone: ZoneId;
  mode: ExposureMode;
  hoursOutside: number;
  userRoutine: string;
  /** Required when zone === "custom_gps". The server derives the label itself. */
  customCoords?: Coords;
}

export interface HourlyPoint {
  hour: number;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  uvIndex: number | null;
}

export interface Telemetry {
  current: {
    time: string;
    usAqi: number;
    pm25: number;
    pm10: number;
    co: number;
    no2: number;
  };
  hourly: HourlyPoint[];
}

export interface HourValue {
  hour: number;
  pm25: number;
}

export interface Metrics {
  riskStatus: RiskBand;
  usAqi: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  meanPm25: number;
  whoMultiple: number;
  cigarettes: number;
  safeWindows: HourValue[];
  peakSpikes: HourValue[];
  hourly: HourlyPoint[];
}

export interface RescheduleItem {
  originalSlot: string;
  optimizedSlot: string;
  reductionPercent: number;
  reason: string;
}

export interface AiInsight {
  executiveSummary: string;
  rescheduledPlan: RescheduleItem[];
  homeVentilationAdvice: string;
  whatsappFamilyAlert: string;
}

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_UPSTREAM_ERROR"
  | "AI_INVALID_JSON"
  | "AI_SCHEMA_MISMATCH";

export type DataSource = "live" | "offline_sample";

export interface SmogResponse {
  metrics: Metrics;
  ai: AiInsight | null;
  aiError?: AiErrorCode;
  meta: {
    /** Model that produced `ai` (or was last attempted). */
    model: string;
    provider: AiProvider;
    latencyMs: number | null;
    dataSource: DataSource;
    zone: ZoneId;
    zoneLabel: string;
    coords: Coords;
    generatedAt: string;
  };
}

export interface InvalidRequestResponse {
  error: "INVALID_REQUEST";
  fieldErrors: Record<string, string[]>;
}

export interface Preset {
  id: "preset_1" | "preset_2" | "preset_3";
  name: string;
  tag: string;
  description: string;
  zone: PresetZoneId;
  mode: ExposureMode;
  hoursOutside: number;
  userRoutine: string;
  /** Preset 3 is expected to be blocked by client-side validation. */
  expectBlocked: boolean;
  expectedOutput: string;
}
