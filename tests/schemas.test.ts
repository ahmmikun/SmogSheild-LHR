import { describe, expect, it } from "vitest";
import { AiInsightSchema, SmogRequestSchema, toFieldErrors } from "@/lib/schemas";
import { PRESETS } from "@/lib/presets";

const valid = { zone: "riphah_johar", mode: "bike", hoursOutside: 5, userRoutine: "Bike to uni at 8 AM" };

describe("SmogRequestSchema", () => {
  it("accepts Presets 1 and 2", () => {
    for (const p of PRESETS.slice(0, 2)) {
      const { zone, mode, hoursOutside, userRoutine } = p;
      expect(SmogRequestSchema.safeParse({ zone, mode, hoursOutside, userRoutine }).success).toBe(true);
    }
  });

  it("rejects Preset 3 with errors on both fields", () => {
    const p = PRESETS[2];
    const r = SmogRequestSchema.safeParse({ zone: p.zone, mode: p.mode, hoursOutside: p.hoursOutside, userRoutine: p.userRoutine });
    expect(r.success).toBe(false);
    const fe = toFieldErrors(r.error!);
    expect(fe.hoursOutside?.[0]).toMatch(/between 1 and 12/);
    expect(fe.userRoutine?.[0]).toMatch(/at least 3/);
  });

  it.each([0, 13, 2.5])("rejects hoursOutside = %s", (hoursOutside) => {
    expect(SmogRequestSchema.safeParse({ ...valid, hoursOutside }).success).toBe(false);
  });

  it("rejects hoursOutside as a string", () => {
    expect(SmogRequestSchema.safeParse({ ...valid, hoursOutside: "5" }).success).toBe(false);
  });

  it("trims routine before checking length", () => {
    expect(SmogRequestSchema.safeParse({ ...valid, userRoutine: "   ab   " }).success).toBe(false);
    const r = SmogRequestSchema.safeParse({ ...valid, userRoutine: "  abc  " });
    expect(r.success && r.data.userRoutine).toBe("abc");
  });

  it("rejects routine over 500 chars", () => {
    expect(SmogRequestSchema.safeParse({ ...valid, userRoutine: "x".repeat(501) }).success).toBe(false);
    expect(SmogRequestSchema.safeParse({ ...valid, userRoutine: "x".repeat(500) }).success).toBe(true);
  });

  it("rejects unknown zones and modes", () => {
    expect(SmogRequestSchema.safeParse({ ...valid, zone: "karachi" }).success).toBe(false);
    expect(SmogRequestSchema.safeParse({ ...valid, mode: "rocket" }).success).toBe(false);
  });

  it("accepts the extended city-wide zones", () => {
    expect(SmogRequestSchema.safeParse({ ...valid, zone: "model_town" }).success).toBe(true);
  });

  describe("custom_gps", () => {
    it("requires coordinates", () => {
      const r = SmogRequestSchema.safeParse({ ...valid, zone: "custom_gps" });
      expect(r.success).toBe(false);
      expect(toFieldErrors(r.error!).zone?.[0]).toMatch(/GPS/);
    });
    it("rejects coordinates outside Lahore", () => {
      const r = SmogRequestSchema.safeParse({ ...valid, zone: "custom_gps", customCoords: { lat: 24.86, lon: 67.0 } });
      expect(r.success).toBe(false);
      expect(toFieldErrors(r.error!).zone?.[0]).toMatch(/outside Lahore/);
    });
    it("accepts in-bounds coordinates", () => {
      const r = SmogRequestSchema.safeParse({ ...valid, zone: "custom_gps", customCoords: { lat: 31.52, lon: 74.35 } });
      expect(r.success).toBe(true);
    });
  });
});

describe("AiInsightSchema", () => {
  const ok = {
    executiveSummary: "Inversion traps PM2.5.",
    rescheduledPlan: [{ originalSlot: "08:00", optimizedSlot: "14:00", reason: "Midday mixing." }],
    homeVentilationAdvice: "Ventilate 13:00–15:00; HEPA overnight.",
    whatsappFamilyAlert: "*Alert* Aaj AQI zyada hai.",
  };

  it("accepts a well-formed insight", () => {
    expect(AiInsightSchema.safeParse(ok).success).toBe(true);
  });

  it("strips model-supplied riskStatus and reductionPercent", () => {
    const r = AiInsightSchema.parse({
      ...ok,
      riskStatus: "GOOD",
      rescheduledPlan: [{ ...ok.rescheduledPlan[0], reductionPercent: 99 }],
    });
    expect(r).not.toHaveProperty("riskStatus");
    expect(r.rescheduledPlan[0]).not.toHaveProperty("reductionPercent");
  });

  it("rejects badly formatted slots", () => {
    expect(
      AiInsightSchema.safeParse({ ...ok, rescheduledPlan: [{ originalSlot: "8 AM", optimizedSlot: "14:00", reason: "x" }] }).success,
    ).toBe(false);
    expect(
      AiInsightSchema.safeParse({ ...ok, rescheduledPlan: [{ originalSlot: "08:30", optimizedSlot: "14:00", reason: "x" }] }).success,
    ).toBe(false);
  });

  it("rejects empty or oversized plans and strings", () => {
    expect(AiInsightSchema.safeParse({ ...ok, rescheduledPlan: [] }).success).toBe(false);
    expect(AiInsightSchema.safeParse({ ...ok, rescheduledPlan: Array(6).fill(ok.rescheduledPlan[0]) }).success).toBe(false);
    expect(AiInsightSchema.safeParse({ ...ok, whatsappFamilyAlert: "x".repeat(601) }).success).toBe(false);
    expect(AiInsightSchema.safeParse({ ...ok, executiveSummary: "" }).success).toBe(false);
  });
});
