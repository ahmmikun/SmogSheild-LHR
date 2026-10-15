import { describe, expect, it } from "vitest";
import { aqiToBand, BAND_ORDER, BAND_TOKENS } from "@/lib/bands";

describe("aqiToBand", () => {
  it.each([
    [0, "GOOD"],
    [50, "GOOD"],
    [51, "MODERATE"],
    [100, "MODERATE"],
    [101, "USG"],
    [150, "USG"],
    [151, "UNHEALTHY"],
    [200, "UNHEALTHY"],
    [201, "VERY_UNHEALTHY"],
    [300, "VERY_UNHEALTHY"],
    [301, "HAZARDOUS"],
    [500, "HAZARDOUS"],
  ] as const)("AQI %i → %s", (aqi, band) => {
    expect(aqiToBand(aqi)).toBe(band);
  });

  it("rounds to nearest integer before mapping", () => {
    expect(aqiToBand(50.4)).toBe("GOOD");
    expect(aqiToBand(50.5)).toBe("MODERATE");
  });

  it("clamps negatives and non-finite values to GOOD", () => {
    expect(aqiToBand(-20)).toBe("GOOD");
    expect(aqiToBand(Number.NaN)).toBe("GOOD");
  });
});

describe("BAND_TOKENS", () => {
  it("defines every band with the EPA hex from design.md", () => {
    expect(BAND_ORDER).toHaveLength(6);
    expect(BAND_TOKENS.GOOD.hex).toBe("#10B981");
    expect(BAND_TOKENS.MODERATE.hex).toBe("#EAB308");
    expect(BAND_TOKENS.USG.hex).toBe("#F97316");
    expect(BAND_TOKENS.UNHEALTHY.hex).toBe("#EF4444");
    expect(BAND_TOKENS.VERY_UNHEALTHY.hex).toBe("#A855F7");
    expect(BAND_TOKENS.HAZARDOUS.hex).toBe("#F43F5E");
  });

  it("keeps the design.md dark-theme chip classes", () => {
    expect(BAND_TOKENS.GOOD.chip).toContain("dark:text-emerald-400");
    expect(BAND_TOKENS.HAZARDOUS.chip).toContain("bg-rose-500/15");
    expect(BAND_TOKENS.HAZARDOUS.chip).toContain("dark:border-rose-500/40");
  });
});
