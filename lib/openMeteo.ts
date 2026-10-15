// Server-only Open-Meteo client with offline fallback (R4, R9.1).
import { OPEN_METEO_ENDPOINT, OPEN_METEO_TIMEOUT_MS } from "./config";
import { countDaytimeValues } from "./calc";
import { OFFLINE_SAMPLE_RAW } from "./offlineSample";
import type { Coords, DataSource, HourlyPoint, Telemetry } from "./types";

export function buildOpenMeteoUrl({ lat, lon }: Coords): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide",
    hourly: "us_aqi,pm2_5,pm10,uv_index",
    timezone: "Asia/Karachi",
    forecast_days: "1",
  });
  return `${OPEN_METEO_ENDPOINT}?${params}`;
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (num(v) ? v : null);

/**
 * Maps a raw Open-Meteo payload to Telemetry. Returns null if the payload
 * fails R4.5 (5 numeric current fields, 24 hours, ≥12 non-null pm2_5) or has
 * fewer than 3 non-null daytime hours (design.md §Safe Windows).
 */
export function parseOpenMeteo(raw: unknown): Telemetry | null {
  if (!raw || typeof raw !== "object") return null;
  type Loose = Record<string, unknown> & { time?: unknown };
  const r = raw as { current?: Loose; hourly?: Record<string, unknown[]> };
  const c = r.current;
  const h = r.hourly;
  if (!c || !h) return null;
  const { us_aqi, pm2_5, pm10, carbon_monoxide, nitrogen_dioxide } = c;
  if (!num(us_aqi) || !num(pm2_5) || !num(pm10) || !num(carbon_monoxide) || !num(nitrogen_dioxide)) return null;
  if (!Array.isArray(h.time) || h.time.length !== 24) return null;
  for (const key of ["us_aqi", "pm2_5", "pm10", "uv_index"]) {
    if (!Array.isArray(h[key]) || h[key].length !== 24) return null;
  }

  const hourly: HourlyPoint[] = h.time.map((t, i) => {
    // "YYYY-MM-DDTHH:00" in Asia/Karachi local time
    const parsed = Number.parseInt(String(t).slice(11, 13), 10);
    return {
      hour: Number.isFinite(parsed) ? parsed : i,
      usAqi: numOrNull(h.us_aqi[i]),
      pm25: numOrNull(h.pm2_5[i]),
      pm10: numOrNull(h.pm10[i]),
      uvIndex: numOrNull(h.uv_index[i]),
    };
  });

  if (hourly.filter((x) => x.pm25 !== null).length < 12) return null;
  if (countDaytimeValues(hourly) < 3) return null;

  return {
    current: {
      time: String(c.time ?? ""),
      usAqi: us_aqi,
      pm25: pm2_5,
      pm10,
      co: carbon_monoxide,
      no2: nitrogen_dioxide,
    },
    hourly,
  };
}

export function offlineTelemetry(): Telemetry {
  const t = parseOpenMeteo(OFFLINE_SAMPLE_RAW);
  if (!t) throw new Error("Bundled offline sample is invalid; re-run npm run record:sample");
  return t;
}

export async function fetchTelemetry(coords: Coords): Promise<{ telemetry: Telemetry; dataSource: DataSource }> {
  try {
    const res = await fetch(buildOpenMeteoUrl(coords), {
      signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[openMeteo] HTTP ${res.status}; using offline sample`);
    } else {
      const telemetry = parseOpenMeteo(await res.json());
      if (telemetry) return { telemetry, dataSource: "live" };
      console.warn("[openMeteo] response failed validation; using offline sample");
    }
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    console.warn(`[openMeteo] ${name === "TimeoutError" ? "timed out" : "request failed"}; using offline sample`);
  }
  return { telemetry: offlineTelemetry(), dataSource: "offline_sample" };
}
