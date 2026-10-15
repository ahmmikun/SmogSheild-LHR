import { OPEN_METEO_TIMEOUT_MS } from "./config.js";
import { OFFLINE_SAMPLE } from "./offlineSample.js";

export function validateOpenMeteoResponse(data) {
  if (!data || !data.current || !data.hourly) return false;
  const c = data.current;
  if (
    typeof c.us_aqi !== "number" ||
    typeof c.pm2_5 !== "number" ||
    typeof c.pm10 !== "number" ||
    typeof c.carbon_monoxide !== "number" ||
    typeof c.nitrogen_dioxide !== "number"
  ) {
    return false;
  }

  const h = data.hourly;
  if (!Array.isArray(h.time) || !Array.isArray(h.pm2_5) || h.time.length < 24) {
    return false;
  }

  const validPm25Count = h.pm2_5.filter((v) => typeof v === "number" && v !== null).length;
  if (validPm25Count < 12) return false;

  // Check that at least 3 values exist in daytime hours (06:00 to 21:00)
  let daytimeCount = 0;
  for (let i = 0; i < h.time.length && i < 24; i++) {
    const timeStr = h.time[i];
    const hour = new Date(timeStr).getHours();
    if (hour >= 6 && hour <= 21 && typeof h.pm2_5[i] === "number" && h.pm2_5[i] !== null) {
      daytimeCount++;
    }
  }

  return daytimeCount >= 3;
}

export function transformOpenMeteoData(data) {
  const c = data.current;
  const h = data.hourly;

  const current = {
    time: c.time || new Date().toISOString(),
    usAqi: c.us_aqi,
    pm25: c.pm2_5,
    pm10: c.pm10,
    co: c.carbon_monoxide,
    no2: c.nitrogen_dioxide,
  };

  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const rawTime = h.time ? h.time[i] : null;
    let hour = i;
    if (rawTime) {
      const match = rawTime.match(/T(\d{2}):/);
      if (match) {
        hour = parseInt(match[1], 10);
      }
    }
    hourly.push({
      hour,
      usAqi: h.us_aqi ? h.us_aqi[i] : null,
      pm25: h.pm2_5 ? h.pm2_5[i] : null,
      pm10: h.pm10 ? h.pm10[i] : null,
      uvIndex: h.uv_index ? h.uv_index[i] : null,
    });
  }

  return { current, hourly };
}

export async function fetchTelemetry(zone) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${zone.lat}&longitude=${zone.lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide&hourly=us_aqi,pm2_5,pm10,uv_index&timezone=Asia%2FKarachi&forecast_days=1`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[OpenMeteo] Non-200 response (${response.status}). Using offline sample.`);
      return { telemetry: OFFLINE_SAMPLE, dataSource: "offline_sample" };
    }

    const data = await response.json();
    if (!validateOpenMeteoResponse(data)) {
      console.warn("[OpenMeteo] Malformed payload received. Using offline sample.");
      return { telemetry: OFFLINE_SAMPLE, dataSource: "offline_sample" };
    }

    const telemetry = transformOpenMeteoData(data);
    return { telemetry, dataSource: "live" };
  } catch (err) {
    console.warn(`[OpenMeteo] Telemetry fetch failed (${err.message}). Using offline sample.`);
    return { telemetry: OFFLINE_SAMPLE, dataSource: "offline_sample" };
  }
}
