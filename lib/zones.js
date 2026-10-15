export const ZONES = {
  // === Mandatory Hackathon Core Zones ===
  riphah_johar: {
    id: "riphah_johar",
    label: "Johar Town / Riphah Campus",
    region: "West & Educational",
    lat: 31.4697,
    lon: 74.2728,
  },
  gulberg: {
    id: "gulberg",
    label: "Gulberg / Kalma Chowk",
    region: "Central & Commercial",
    lat: 31.5204,
    lon: 74.3587,
  },
  mall_road: {
    id: "mall_road",
    label: "Mall Road / Civil Lines",
    region: "Central & Commercial",
    lat: 31.5580,
    lon: 74.3292,
  },
  dha: {
    id: "dha",
    label: "DHA Phase 5",
    region: "East & Cantonment",
    lat: 31.4720,
    lon: 74.4110,
  },
  shahdara: {
    id: "shahdara",
    label: "Shahdara Industrial Area",
    region: "North & Industrial",
    lat: 31.6215,
    lon: 74.2825,
  },

  // === Extended Lahore Zones (City-Wide Compatibility) ===
  model_town: {
    id: "model_town",
    label: "Model Town / Central Park",
    region: "South & Suburbs",
    lat: 31.4883,
    lon: 74.3204,
  },
  iqbal_town: {
    id: "iqbal_town",
    label: "Allama Iqbal Town / Wahdat Road",
    region: "West & Educational",
    lat: 31.5126,
    lon: 74.2801,
  },
  cantt: {
    id: "cantt",
    label: "Lahore Cantt / Saddar Bazaar",
    region: "East & Cantonment",
    lat: 31.5367,
    lon: 74.3804,
  },
  bahria: {
    id: "bahria",
    label: "Bahria Town / Raiwind Road",
    region: "South & Suburbs",
    lat: 31.3686,
    lon: 74.1837,
  },
  walled_city: {
    id: "walled_city",
    label: "Walled City / Anarkali / Mozang",
    region: "Central & Commercial",
    lat: 31.5725,
    lon: 74.3095,
  },
  faisal_town: {
    id: "faisal_town",
    label: "Faisal Town / Township",
    region: "West & Educational",
    lat: 31.4642,
    lon: 74.3015,
  },
  garden_town: {
    id: "garden_town",
    label: "Garden Town / Barkat Market",
    region: "Central & Commercial",
    lat: 31.5032,
    lon: 74.3262,
  },
  wapda_town: {
    id: "wapda_town",
    label: "WAPDA Town / Valencia / Lake City",
    region: "South & Suburbs",
    lat: 31.4332,
    lon: 74.2588,
  },
  badami_bagh: {
    id: "badami_bagh",
    label: "Badami Bagh / Ravi Road",
    region: "North & Industrial",
    lat: 31.5976,
    lon: 74.3168,
  },
  thokar: {
    id: "thokar",
    label: "Thokar Niaz Baig / Canal Road",
    region: "West & Educational",
    lat: 31.4746,
    lon: 74.2415,
  },
  askari: {
    id: "askari",
    label: "Askari 10 & 11 / Ring Road",
    region: "East & Cantonment",
    lat: 31.5290,
    lon: 74.4255,
  },
  quaid_industrial: {
    id: "quaid_industrial",
    label: "Quaid-e-Azam Industrial Estate",
    region: "North & Industrial",
    lat: 31.4475,
    lon: 74.3240,
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
