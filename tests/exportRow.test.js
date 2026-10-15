import test from "node:test";
import assert from "node:assert/strict";
import { buildTestingRow, escapeMarkdownCell } from "../lib/exportRow.js";

test("escapeMarkdownCell: escapes pipe characters and removes newlines", () => {
  const input = "Line 1\nLine 2 | Extra";
  const escaped = escapeMarkdownCell(input);
  assert.equal(escaped, "Line 1 Line 2 \\| Extra");
});

test("buildTestingRow: produces valid 6-column markdown table", () => {
  const result = {
    metrics: { usAqi: 178, riskStatus: "UNHEALTHY", cigarettes: 1.9 },
    ai: { executiveSummary: "Smog alert" },
    meta: { latencyMs: 412 },
  };

  const md = buildTestingRow("Preset 1: Bike Commute", { zone: "riphah_johar", mode: "bike", hoursOutside: 5, userRoutine: "Commute" }, result, false);
  const lines = md.split("\n");

  assert.equal(lines.length, 3);
  // Header row
  assert.ok(lines[0].includes("| Test Scenario | Input | Expected Output | Actual Outcome | Pass/Fail | Known Limitations |"));
  // Data row has 6 cells (7 pipes)
  const pipeCount = (lines[2].match(/\|/g) || []).length;
  assert.equal(pipeCount, 7);
  assert.ok(lines[2].includes("PASS"));
});

test("buildTestingRow: handles blocked validation edge case (Preset 3)", () => {
  const md = buildTestingRow("Preset 3: Edge-Case Test", "Johar Town, bike, 15h, []", null, true);
  assert.ok(md.includes("PASS"));
  assert.ok(md.includes("Client validation caught invalid bounds"));
});
