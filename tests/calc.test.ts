import { describe, expect, it } from "vitest";
import {
  cigarettes,
  computeMetrics,
  hourTo12h,
  hourToSlot,
  meanPm25,
  peakSpikes,
  round1,
  safeWindows,
  slotToHour,
  whoMultiple,
} from "@/lib/calc";
import { aqiToBand } from "@/lib/bands";
import { MODES } from "@/lib/zones";
import { makeHourly, makeTelemetry } from "./fixtures";

describe("worked examples (design.md §Cigarette Equivalence)", () => {
  it("Preset 1: bike, 5 h, mean 110 → 1.9", () => {
    expect(cigarettes(110, 5, MODES.bike.multiplier)).toBe(1.9);
  });
  it("Preset 2: elder_asthma, 2 h, mean 110 → 0.8", () => {
    expect(cigarettes(110, 2, MODES.elder_asthma.multiplier)).toBe(0.8);
  });
  it("car, 12 h, mean 110 → 1.5", () => {
    expect(cigarettes(110, 12, MODES.car.multiplier)).toBe(1.5);
  });
  it("WHO multiple: 165 µg/m³ → 11.0", () => {
    expect(whoMultiple(165)).toBe(11);
  });
});

describe("meanPm25", () => {
  it("excludes null hours", () => {
    const hourly = makeHourly([10, null, 20, null, ...Array(20).fill(null)]);
    expect(meanPm25(hourly)).toBe(15);
  });
  it("returns 0 when every hour is null", () => {
    expect(meanPm25(makeHourly(Array(24).fill(null)))).toBe(0);
  });
  it("rounds to 1 decimal", () => {
    expect(meanPm25(makeHourly([1, 2, 2, ...Array(21).fill(null)]))).toBe(1.7);
  });
});

describe("safeWindows / peakSpikes", () => {
  const hourly = makeHourly();

  it("finds the 3 cleanest daytime hours, ascending", () => {
    expect(safeWindows(hourly)).toEqual([
      { hour: 14, pm25: 62 },
      { hour: 15, pm25: 64.5 },
      { hour: 13, pm25: 70.1 },
    ]);
  });

  it("finds the 3 dirtiest daytime hours, descending", () => {
    expect(peakSpikes(hourly)).toEqual([
      { hour: 8, pm25: 188 },
      { hour: 21, pm25: 176.2 },
      { hour: 7, pm25: 171.9 },
    ]);
  });

  it("ignores hours outside 06–21 even if cleaner", () => {
    const pm = Array(24).fill(100);
    pm[3] = 1; // night
    pm[22] = 2; // night
    const s = safeWindows(makeHourly(pm));
    expect(s.every((h) => h.hour >= 6 && h.hour <= 21)).toBe(true);
  });

  it("breaks ties in favour of the earlier hour", () => {
    const pm = Array(24).fill(50);
    expect(safeWindows(makeHourly(pm)).map((h) => h.hour)).toEqual([6, 7, 8]);
    expect(peakSpikes(makeHourly(pm)).map((h) => h.hour)).toEqual([6, 7, 8]);
  });

  it("skips null daytime hours", () => {
    const pm = Array(24).fill(100);
    pm[6] = null;
    pm[7] = 1;
    expect(safeWindows(makeHourly(pm))[0]).toEqual({ hour: 7, pm25: 1 });
    expect(safeWindows(makeHourly(pm)).some((h) => h.hour === 6)).toBe(false);
  });
});

describe("computeMetrics", () => {
  const t = makeTelemetry();

  it("assembles every field deterministically", () => {
    const m = computeMetrics(t, { hoursOutside: 5 }, MODES.bike.multiplier);
    expect(m.riskStatus).toBe("UNHEALTHY");
    expect(m.usAqi).toBe(178);
    expect(m.pm25).toBe(165);
    expect(m.whoMultiple).toBe(11);
    expect(m.safeWindows).toHaveLength(3);
    expect(m.peakSpikes).toHaveLength(3);
    expect(m.hourly).toHaveLength(24);
    expect(m.cigarettes).toBe(cigarettes(m.meanPm25, 5, 1.8));
  });

  it("returns identical output for identical input (R5.5)", () => {
    const a = computeMetrics(t, { hoursOutside: 4 }, 1.5);
    const b = computeMetrics(t, { hoursOutside: 4 }, 1.5);
    expect(a).toEqual(b);
  });

  it("riskStatus always equals aqiToBand(usAqi)", () => {
    for (const usAqi of [10, 75, 120, 180, 250, 400]) {
      const m = computeMetrics(makeTelemetry({ usAqi }), { hoursOutside: 1 }, 1);
      expect(m.riskStatus).toBe(aqiToBand(m.usAqi));
    }
  });
});

describe("correctness properties", () => {
  it("cigarettes never decreases as hours or multiplier increase", () => {
    let prev = -1;
    for (let h = 1; h <= 12; h++) {
      const c = cigarettes(110, h, 1.5);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
    prev = -1;
    for (const mult of [0.6, 1.5, 1.8, 2.0]) {
      const c = cigarettes(110, 6, mult);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it("max(safe) ≤ min(peaks)", () => {
    const hourly = makeHourly();
    const maxSafe = Math.max(...safeWindows(hourly).map((h) => h.pm25));
    const minPeak = Math.min(...peakSpikes(hourly).map((h) => h.pm25));
    expect(maxSafe).toBeLessThanOrEqual(minPeak);
  });
});

describe("helpers", () => {
  it("round1", () => {
    expect(round1(1.875)).toBe(1.9);
    expect(round1(0.8333)).toBe(0.8);
  });
  it("slot conversions", () => {
    expect(hourToSlot(8)).toBe("08:00");
    expect(slotToHour("14:00")).toBe(14);
    expect(hourTo12h(0)).toBe("12 AM");
    expect(hourTo12h(14)).toBe("2 PM");
    expect(hourTo12h(12)).toBe("12 PM");
  });
});
