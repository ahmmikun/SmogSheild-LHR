export const BAND_TOKENS = {
  GOOD: {
    band: "GOOD",
    label: "Good",
    color: "#10B981",
    bgClass: "band-good",
    textColor: "#34D399",
    range: "0–50",
  },
  MODERATE: {
    band: "MODERATE",
    label: "Moderate",
    color: "#EAB308",
    bgClass: "band-moderate",
    textColor: "#FDE047",
    range: "51–100",
  },
  USG: {
    band: "USG",
    label: "Unhealthy for Sensitive Groups",
    color: "#F97316",
    bgClass: "band-usg",
    textColor: "#FB923C",
    range: "101–150",
  },
  UNHEALTHY: {
    band: "UNHEALTHY",
    label: "Unhealthy",
    color: "#EF4444",
    bgClass: "band-unhealthy",
    textColor: "#F87171",
    range: "151–200",
  },
  VERY_UNHEALTHY: {
    band: "VERY_UNHEALTHY",
    label: "Very Unhealthy",
    color: "#A855F7",
    bgClass: "band-very-unhealthy",
    textColor: "#C084FC",
    range: "201–300",
  },
  HAZARDOUS: {
    band: "HAZARDOUS",
    label: "Hazardous",
    color: "#F43F5E",
    bgClass: "band-hazardous",
    textColor: "#FB7185",
    range: "≥ 301",
  },
};

export function aqiToBand(aqi) {
  const rounded = Math.round(Math.max(0, Number(aqi) || 0));
  if (rounded <= 50) return "GOOD";
  if (rounded <= 100) return "MODERATE";
  if (rounded <= 150) return "USG";
  if (rounded <= 200) return "UNHEALTHY";
  if (rounded <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}
