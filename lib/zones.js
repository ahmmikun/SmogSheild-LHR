export const ZONES = {
  riphah_johar: {
    id: "riphah_johar",
    label: "Johar Town / Riphah Campus",
    lat: 31.4697,
    lon: 74.2728,
  },
  gulberg: {
    id: "gulberg",
    label: "Gulberg / Kalma Chowk",
    lat: 31.5204,
    lon: 74.3587,
  },
  mall_road: {
    id: "mall_road",
    label: "Mall Road / Civil Lines",
    lat: 31.5580,
    lon: 74.3292,
  },
  dha: {
    id: "dha",
    label: "DHA Phase 5",
    lat: 31.4720,
    lon: 74.4110,
  },
  shahdara: {
    id: "shahdara",
    label: "Shahdara Industrial",
    lat: 31.6215,
    lon: 74.2825,
  },
};

export const MODES = {
  bike: {
    id: "bike",
    label: "Motorbike / Yango / Bykea rider",
    subLabel: "Open-air particulate intake",
    multiplier: 1.8,
    icon: "Bike",
  },
  walk: {
    id: "walk",
    label: "Outdoor pedestrian / runner",
    subLabel: "Elevated respiratory exertion",
    multiplier: 1.5,
    icon: "Footprints",
  },
  car: {
    id: "car",
    label: "Sealed vehicle",
    subLabel: "Cabin recirculation & filtration",
    multiplier: 0.6,
    icon: "Car",
  },
  elder_asthma: {
    id: "elder_asthma",
    label: "Sensitive group (elderly / asthma)",
    subLabel: "High physiological vulnerability",
    multiplier: 2.0,
    icon: "ShieldAlert",
  },
};

export const PRESETS = [
  {
    id: "preset_1",
    name: "Preset 1: Bike Commute",
    badge: "CRITICAL EXPOSURE",
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 5,
    userRoutine: "Depart on bike for university at 8 AM, return at 2 PM, evening walk on rooftop at 6 PM",
  },
  {
    id: "preset_2",
    name: "Preset 2: Asthma Care",
    badge: "VULNERABLE GROUP",
    zone: "mall_road",
    mode: "elder_asthma",
    hoursOutside: 2,
    userRoutine: "Morning walk in Lawrence Garden at 7 AM, afternoon visit to pharmacy at 4 PM",
  },
  {
    id: "preset_3",
    name: "Preset 3: Edge-Case Test",
    badge: "ERROR BOUNDARY",
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 15, // Out of bounds (>12)
    userRoutine: "", // Empty routine (<3 chars)
  },
];
