import { describe, expect, it } from "vitest";
import { buildTestingRow, buildTestingTable, EXPORT_HEADER, EXPORT_SEPARATOR, escapeCell, passFail, type ExportCase } from "@/lib/exportRow";
import { computeMetrics } from "@/lib/calc";
import { makeTelemetry } from "./fixtures";
import type { SmogResponse } from "@/lib/types";

const metrics = computeMetrics(makeTelemetry(), { hoursOutside: 5 }, 1.8);
const response: SmogResponse = {
  metrics,
  ai: {
    executiveSummary: "x",
    rescheduledPlan: [{ originalSlot: "08:00", optimizedSlot: "14:00", reductionPercent: 67, reason: "y" }],
    homeVentilationAdvice: "z",
    whatsappFamilyAlert: "*a*",
  },
  meta: {
    model: "llama-3.1-8b-instant",
    provider: "Groq",
    latencyMs: 412,
    dataSource: "live",
    zone: "riphah_johar",
    zoneLabel: "Johar Town / Riphah Campus",
    coords: { lat: 31.4697, lon: 74.2728 },
    generatedAt: "2026-10-15T09:00:00Z",
  },
};

const run: ExportCase = { kind: "run", scenario: "Preset 1", input: "Johar | bike\n5 h", expected: "Plan", httpStatus: 200, response };

/** Splits a row on unescaped pipes. */
const cells = (row: string) => row.slice(2, -2).split(/(?<!\\) \| /);

describe("buildTestingRow", () => {
  it("emits exactly 6 cells in order", () => {
    const c = cells(buildTestingRow(run));
    expect(c).toHaveLength(6);
    expect(c[0]).toBe("Preset 1");
    expect(c[4]).toBe("PASS");
    expect(c[3]).toContain("AQI 178 (UNHEALTHY)");
    expect(c[3]).toContain("412 ms");
  });

  it("escapes pipes and removes newlines", () => {
    const row = buildTestingRow(run);
    expect(row).toContain("Johar \\| bike 5 h");
    expect(row).not.toContain("\n");
    expect(escapeCell("a|b\r\nc")).toBe("a\\|b c");
  });

  it("includes header and separator rows", () => {
    const lines = buildTestingTable(run).split("\n");
    expect(lines[0]).toBe(EXPORT_HEADER);
    expect(lines[1]).toBe(EXPORT_SEPARATOR);
    expect(cells(lines[0])).toEqual(["Test Scenario", "Input", "Expected Output", "Actual Outcome", "Pass/Fail", "Known Limitations"]);
  });
});

describe("PASS/FAIL rules (R8.4)", () => {
  it("run: PASS only with HTTP 200 and ai not null", () => {
    expect(passFail(run)).toBe("PASS");
    expect(passFail({ ...run, response: { ...response, ai: null, aiError: "AI_TIMEOUT" } })).toBe("FAIL");
    expect(passFail({ ...run, httpStatus: 500, response: null })).toBe("FAIL");
  });

  it("blocked Preset 3: PASS", () => {
    const blocked: ExportCase = {
      kind: "blocked",
      scenario: "Preset 3",
      input: "15 h, empty routine",
      expected: "Blocked",
      fieldErrors: { hoursOutside: ["x"], userRoutine: ["y"] },
    };
    const c = cells(buildTestingRow(blocked));
    expect(c[4]).toBe("PASS");
    expect(c[3]).toContain("hoursOutside, userRoutine");
    expect(c[3]).toContain("0 requests");
  });

  it("notes the offline sample as a limitation", () => {
    const off = { ...run, response: { ...response, meta: { ...response.meta, dataSource: "offline_sample" as const } } };
    expect(cells(buildTestingRow(off))[5]).toMatch(/offline sample/);
  });
});
