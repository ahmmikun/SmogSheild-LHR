import type { Preset } from "./types";

/** Judge demo presets, exactly as specified in R3.2–R3.4. */
export const PRESETS: Preset[] = [
  {
    id: "preset_1",
    name: "Preset 1: Bike Commute",
    tag: "CRITICAL EXPOSURE",
    description: "Student on a motorbike in Johar Town, 5 h outdoors",
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 5,
    userRoutine: "Depart on bike for university at 8 AM, return at 2 PM, evening walk on rooftop at 6 PM",
    expectBlocked: false,
    expectedOutput: "Severe exposure flagged; cigarette equivalence calculated; commute moved to a safe window",
  },
  {
    id: "preset_2",
    name: "Preset 2: Asthma Care",
    tag: "VULNERABLE GROUP",
    description: "Elderly / asthma patient on Mall Road, 2 h outdoors",
    zone: "mall_road",
    mode: "elder_asthma",
    hoursOutside: 2,
    userRoutine: "Morning walk in Lawrence Garden at 7 AM, afternoon visit to pharmacy at 4 PM",
    expectBlocked: false,
    expectedOutput: "2.0x vulnerability weight applied; morning walk moved away from peak inversion; ventilation hours given",
  },
  {
    id: "preset_3",
    name: "Preset 3: Edge-Case Test",
    tag: "ERROR BOUNDARY",
    description: "15 h outside + empty routine: must be blocked client-side",
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 15,
    userRoutine: "",
    expectBlocked: true,
    expectedOutput: "Client-side validation blocks submission; inline errors shown; zero requests sent",
  },
];

export function getPreset(id: Preset["id"]): Preset {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset ${id}`);
  return p;
}
