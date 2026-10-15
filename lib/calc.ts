// Deterministic calculation engine (R5). No LLM involvement.
import { aqiToBand } from "./bands";
import { DAYTIME_END, DAYTIME_START, PM25_PER_CIGARETTE, WHO_PM25_24H } from "./config";
import type { HourValue, HourlyPoint, Metrics, Telemetry } from "./types";

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Mean of non-null hourly PM2.5, rounded to 1 decimal. Returns 0 when no data. */
export function meanPm25(hourly: HourlyPoint[]): number {
  const vals = hourly.map((h) => h.pm25).filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return 0;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Berkeley Earth cigarette equivalence (D7). */
export function cigarettes(mean: number, hoursOutside: number, multiplier: number): number {
  return round1((mean / PM25_PER_CIGARETTE) * (hoursOutside / 24) * multiplier);
}

/** Current PM2.5 as a multiple of the WHO 24 h guideline (D8). */
export function whoMultiple(currentPm25: number): number {
  return round1(currentPm25 / WHO_PM25_24H);
}

export function isDaytime(hour: number): boolean {
  return hour >= DAYTIME_START && hour <= DAYTIME_END;
}

function daytimeCandidates(hourly: HourlyPoint[]): HourValue[] {
  return hourly
    .filter((h) => isDaytime(h.hour) && typeof h.pm25 === "number")
    .map((h) => ({ hour: h.hour, pm25: h.pm25 as number }));
}

/** 3 cleanest daytime hours, ascending PM2.5; ties → earlier hour (D9). */
export function safeWindows(hourly: HourlyPoint[]): HourValue[] {
  return daytimeCandidates(hourly)
    .sort((a, b) => a.pm25 - b.pm25 || a.hour - b.hour)
    .slice(0, 3);
}

/** 3 dirtiest daytime hours, descending PM2.5; ties → earlier hour (D9). */
export function peakSpikes(hourly: HourlyPoint[]): HourValue[] {
  return daytimeCandidates(hourly)
    .sort((a, b) => b.pm25 - a.pm25 || a.hour - b.hour)
    .slice(0, 3);
}

export function countDaytimeValues(hourly: HourlyPoint[]): number {
  return daytimeCandidates(hourly).length;
}

export function computeMetrics(
  telemetry: Telemetry,
  request: { hoursOutside: number },
  multiplier: number,
): Metrics {
  const { current, hourly } = telemetry;
  const mean = meanPm25(hourly);
  return {
    riskStatus: aqiToBand(current.usAqi),
    usAqi: Math.round(current.usAqi),
    pm25: round1(current.pm25),
    pm10: round1(current.pm10),
    co: round1(current.co),
    no2: round1(current.no2),
    meanPm25: mean,
    whoMultiple: whoMultiple(current.pm25),
    cigarettes: cigarettes(mean, request.hoursOutside, multiplier),
    safeWindows: safeWindows(hourly),
    peakSpikes: peakSpikes(hourly),
    hourly,
  };
}

/** "HH:00" ↔ hour helpers shared by server and client. */
export function hourToSlot(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function slotToHour(slot: string): number {
  return Number.parseInt(slot.slice(0, 2), 10);
}

/** "14:00 (2 PM)" style label for non-technical readers. */
export function hourTo12h(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}
