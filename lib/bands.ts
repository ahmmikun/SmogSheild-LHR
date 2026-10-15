import type { RiskBand } from "./types";

export interface BandToken {
  band: RiskBand;
  label: string;
  shortLabel: string;
  range: string;
  hex: string;
  /** Chip / card classes. Dark values follow design.md; light values are AA-contrast equivalents. */
  chip: string;
  /** Solid histogram bar fill. */
  bar: string;
  /** Text colour for large numbers. */
  text: string;
  /** One-line plain-language guidance shown next to the number. */
  advice: string;
}

// Full class strings are written literally so Tailwind can detect them.
export const BAND_TOKENS: Record<RiskBand, BandToken> = {
  GOOD: {
    band: "GOOD",
    label: "Good",
    shortLabel: "Good",
    range: "0–50",
    hex: "#10B981",
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-600/40 dark:text-emerald-400 dark:border-emerald-500/30",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    advice: "Air is clean. Outdoor activity is fine for everyone.",
  },
  MODERATE: {
    band: "MODERATE",
    label: "Moderate",
    shortLabel: "Moderate",
    range: "51–100",
    hex: "#EAB308",
    chip: "bg-yellow-500/10 text-yellow-800 border-yellow-600/40 dark:text-yellow-300 dark:border-yellow-500/30",
    bar: "bg-yellow-500",
    text: "text-yellow-800 dark:text-yellow-300",
    advice: "Acceptable. Very sensitive people should limit long outdoor exertion.",
  },
  USG: {
    band: "USG",
    label: "Unhealthy for Sensitive Groups",
    shortLabel: "USG",
    range: "101–150",
    hex: "#F97316",
    chip: "bg-orange-500/10 text-orange-800 border-orange-600/40 dark:text-orange-400 dark:border-orange-500/30",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    advice: "Children, elderly and asthma patients should cut outdoor time.",
  },
  UNHEALTHY: {
    band: "UNHEALTHY",
    label: "Unhealthy",
    shortLabel: "Unhealthy",
    range: "151–200",
    hex: "#EF4444",
    chip: "bg-red-500/10 text-red-700 border-red-600/40 dark:text-red-400 dark:border-red-500/30",
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    advice: "Everyone is affected. Wear an N95 outside and keep windows shut.",
  },
  VERY_UNHEALTHY: {
    band: "VERY_UNHEALTHY",
    label: "Very Unhealthy",
    shortLabel: "Very Unhealthy",
    range: "201–300",
    hex: "#A855F7",
    chip: "bg-purple-500/10 text-purple-700 border-purple-600/40 dark:text-purple-400 dark:border-purple-500/30",
    bar: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    advice: "Health alert. Avoid outdoor exertion; run air purifiers indoors.",
  },
  HAZARDOUS: {
    band: "HAZARDOUS",
    label: "Hazardous",
    shortLabel: "Hazardous",
    range: "301+",
    hex: "#F43F5E",
    chip: "bg-rose-500/15 text-rose-700 border-rose-600/50 dark:text-rose-400 dark:border-rose-500/40",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    advice: "Emergency conditions. Stay indoors unless absolutely necessary.",
  },
};

export const BAND_ORDER: RiskBand[] = ["GOOD", "MODERATE", "USG", "UNHEALTHY", "VERY_UNHEALTHY", "HAZARDOUS"];

/** Maps a US AQI integer to its EPA band. Rounds first; negatives clamp to 0 (design.md §AQI Band Mapping). */
export function aqiToBand(aqi: number): RiskBand {
  const n = Math.round(Math.max(0, Number.isFinite(aqi) ? aqi : 0));
  if (n <= 50) return "GOOD";
  if (n <= 100) return "MODERATE";
  if (n <= 150) return "USG";
  if (n <= 200) return "UNHEALTHY";
  if (n <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}
