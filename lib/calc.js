import { aqiToBand } from "./bands.js";
import { PM25_PER_CIGARETTE, WHO_PM25_24H } from "./config.js";

export function round1(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

export function computeMeanPm25(hourly) {
  const valid = hourly.filter((h) => h && h.pm25 !== null && typeof h.pm25 === "number");
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, h) => acc + h.pm25, 0);
  return round1(sum / valid.length);
}

export function computeCigarettes(meanPm25, hoursOutside, multiplier) {
  const raw = (meanPm25 / PM25_PER_CIGARETTE) * (hoursOutside / 24) * multiplier;
  return round1(raw);
}

export function computeWhoMultiple(currentPm25) {
  return round1(currentPm25 / WHO_PM25_24H);
}

export function extractDaytimeWindows(hourly) {
  // Daytime range is 06:00 to 21:00 inclusive (hours 6 through 21)
  const daytime = hourly
    .filter((h) => h && h.hour >= 6 && h.hour <= 21 && h.pm25 !== null && typeof h.pm25 === "number")
    .map((h) => ({ hour: h.hour, pm25: h.pm25 }));

  // Safe windows: 3 lowest PM2.5, ties go to earlier hour
  const safeWindows = [...daytime]
    .sort((a, b) => a.pm25 - b.pm25 || a.hour - b.hour)
    .slice(0, 3);

  // Peak spikes: 3 highest PM2.5, ties go to earlier hour
  const peakSpikes = [...daytime]
    .sort((a, b) => b.pm25 - a.pm25 || a.hour - b.hour)
    .slice(0, 3);

  return { safeWindows, peakSpikes };
}

export function computeMetrics(telemetry, request, multiplier) {
  const { current, hourly } = telemetry;
  const meanPm25 = computeMeanPm25(hourly);
  const cigarettes = computeCigarettes(meanPm25, request.hoursOutside, multiplier);
  const whoMultiple = computeWhoMultiple(current.pm25);
  const { safeWindows, peakSpikes } = extractDaytimeWindows(hourly);
  const riskStatus = aqiToBand(current.usAqi);

  return {
    riskStatus,
    usAqi: Math.round(current.usAqi),
    pm25: round1(current.pm25),
    pm10: round1(current.pm10),
    co: round1(current.co),
    no2: round1(current.no2),
    meanPm25,
    whoMultiple,
    cigarettes,
    safeWindows,
    peakSpikes,
    hourly,
  };
}
