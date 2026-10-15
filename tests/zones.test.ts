import { describe, expect, it } from "vitest";
import { CORE_ZONE_IDS, isWithinLahore, MODES, nearestZone, ZONES } from "@/lib/zones";
import { PRESETS } from "@/lib/presets";

describe("zones (R2.1 + city-wide extension)", () => {
  it("includes the five mandated zones with exact coordinates", () => {
    expect(CORE_ZONE_IDS).toEqual(["riphah_johar", "gulberg", "mall_road", "dha", "shahdara"]);
    expect(ZONES.riphah_johar).toMatchObject({ lat: 31.4697, lon: 74.2728 });
    expect(ZONES.gulberg).toMatchObject({ lat: 31.5204, lon: 74.3587 });
    expect(ZONES.mall_road).toMatchObject({ lat: 31.558, lon: 74.3292 });
    expect(ZONES.dha).toMatchObject({ lat: 31.472, lon: 74.411 });
    expect(ZONES.shahdara).toMatchObject({ lat: 31.6215, lon: 74.2825 });
  });

  it("keeps every zone inside the Lahore bounding box", () => {
    for (const z of Object.values(ZONES)) expect(isWithinLahore(z.lat, z.lon)).toBe(true);
  });

  it("rejects coordinates outside Lahore", () => {
    expect(isWithinLahore(24.86, 67.0)).toBe(false); // Karachi
  });

  it("finds the nearest zone for a GPS fix", () => {
    expect(nearestZone(31.521, 74.359).id).toBe("gulberg");
  });
});

describe("modes (R2.2)", () => {
  it("has exactly four modes with the spec multipliers", () => {
    expect(Object.keys(MODES)).toEqual(["bike", "walk", "car", "elder_asthma"]);
    expect(MODES.bike.multiplier).toBe(1.8);
    expect(MODES.walk.multiplier).toBe(1.5);
    expect(MODES.car.multiplier).toBe(0.6);
    expect(MODES.elder_asthma.multiplier).toBe(2.0);
  });
});

describe("presets (R3)", () => {
  it("matches R3.2–R3.4 exactly", () => {
    const [p1, p2, p3] = PRESETS;
    expect(p1).toMatchObject({
      name: "Preset 1: Bike Commute",
      zone: "riphah_johar",
      mode: "bike",
      hoursOutside: 5,
      userRoutine: "Depart on bike for university at 8 AM, return at 2 PM, evening walk on rooftop at 6 PM",
    });
    expect(p2).toMatchObject({
      name: "Preset 2: Asthma Care",
      zone: "mall_road",
      mode: "elder_asthma",
      hoursOutside: 2,
      userRoutine: "Morning walk in Lawrence Garden at 7 AM, afternoon visit to pharmacy at 4 PM",
    });
    expect(p3).toMatchObject({ name: "Preset 3: Edge-Case Test", hoursOutside: 15, userRoutine: "", expectBlocked: true });
  });
});
