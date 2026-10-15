import type { HourlyPoint, Telemetry } from "@/lib/types";

/**
 * Deterministic 24-hour fixture modelled on design.md's worked example:
 * safe windows 14/15/13, peaks 08/21/07, current PM2.5 165 (WHO ×11.0), AQI 178.
 */
export const FIXTURE_PM25: (number | null)[] = [
  150.2, 148, 145, 140, 138, 142, // 00–05
  95, 171.9, 188, 160, 130, 110, // 06–11
  85, 70.1, 62, 64.5, 80, 100, // 12–17
  120, 140, 160, 176.2, 165, 155, // 18–23
];

export function aqiFor(pm: number | null): number | null {
  return pm === null ? null : Math.round(pm * 1.1);
}

export function makeHourly(pm: (number | null)[] = FIXTURE_PM25): HourlyPoint[] {
  return pm.map((v, hour) => ({
    hour,
    pm25: v,
    usAqi: aqiFor(v),
    pm10: v === null ? null : Math.round(v * 1.45),
    uvIndex: hour >= 7 && hour <= 17 ? 3 : 0,
  }));
}

export function makeTelemetry(overrides: Partial<Telemetry["current"]> = {}, pm?: (number | null)[]): Telemetry {
  return {
    current: { time: "2026-10-15T09:00", usAqi: 178, pm25: 165, pm10: 240, co: 1450, no2: 62, ...overrides },
    hourly: makeHourly(pm),
  };
}

/** Raw Open-Meteo-shaped payload, for client tests. */
export function makeOpenMeteoPayload(pm: (number | null)[] = FIXTURE_PM25) {
  return {
    latitude: 31.47,
    longitude: 74.27,
    timezone: "Asia/Karachi",
    current: { time: "2026-10-15T09:00", us_aqi: 178, pm2_5: 165, pm10: 240, carbon_monoxide: 1450, nitrogen_dioxide: 62 },
    hourly: {
      time: pm.map((_, h) => `2026-10-15T${String(h).padStart(2, "0")}:00`),
      us_aqi: pm.map(aqiFor),
      pm2_5: pm,
      pm10: pm.map((v) => (v === null ? null : Math.round(v * 1.45))),
      uv_index: pm.map((_, h) => (h >= 7 && h <= 17 ? 3 : 0)),
    },
  };
}
