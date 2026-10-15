import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCigarettes,
  computeWhoMultiple,
  computeMeanPm25,
  extractDaytimeWindows,
  computeMetrics,
} from "../lib/calc.js";
import { OFFLINE_SAMPLE } from "../lib/offlineSample.js";

test("Cigarette Equivalence: matches worked examples in design specification", () => {
  // Preset 1: bike (1.8), 5 hours, meanPm25 = 110 µg/m³
  // (110 / 22) * (5 / 24) * 1.8 = 5 * 0.20833 * 1.8 = 1.875 -> 1.9
  const p1Cigs = computeCigarettes(110, 5, 1.8);
  assert.equal(p1Cigs, 1.9);

  // Preset 2: elder_asthma (2.0), 2 hours, meanPm25 = 110 µg/m³
  // (110 / 22) * (2 / 24) * 2.0 = 5 * 0.08333 * 2.0 = 0.833 -> 0.8
  const p2Cigs = computeCigarettes(110, 2, 2.0);
  assert.equal(p2Cigs, 0.8);

  // Car: sealed cabin (0.6), 12 hours, meanPm25 = 110 µg/m³
  // (110 / 22) * (12 / 24) * 0.6 = 5 * 0.5 * 0.6 = 1.5
  const carCigs = computeCigarettes(110, 12, 0.6);
  assert.equal(carCigs, 1.5);
});

test("WHO Multiple: matches 15 µg/m³ guideline calculation", () => {
  assert.equal(computeWhoMultiple(165), 11.0);
  assert.equal(computeWhoMultiple(30), 2.0);
  assert.equal(computeWhoMultiple(15), 1.0);
});

test("Safe Windows & Peak Spikes: isolates 3 slots within 06:00 to 21:00 PKT", () => {
  const { safeWindows, peakSpikes } = extractDaytimeWindows(OFFLINE_SAMPLE.hourly);

  assert.equal(safeWindows.length, 3);
  assert.equal(peakSpikes.length, 3);

  // Check all hours are in daytime bounds [6, 21]
  safeWindows.forEach((w) => {
    assert.ok(w.hour >= 6 && w.hour <= 21, `Hour ${w.hour} outside daytime bounds`);
  });
  peakSpikes.forEach((s) => {
    assert.ok(s.hour >= 6 && s.hour <= 21, `Hour ${s.hour} outside daytime bounds`);
  });

  // Safe windows are ascending by PM2.5
  assert.ok(safeWindows[0].pm25 <= safeWindows[1].pm25);
  assert.ok(safeWindows[1].pm25 <= safeWindows[2].pm25);

  // Peak spikes are descending by PM2.5
  assert.ok(peakSpikes[0].pm25 >= peakSpikes[1].pm25);
  assert.ok(peakSpikes[1].pm25 >= peakSpikes[2].pm25);
});

test("computeMetrics: computes deterministic metrics reproducibly", () => {
  const req = { hoursOutside: 5, userRoutine: "University commute" };
  const res1 = computeMetrics(OFFLINE_SAMPLE, req, 1.8);
  const res2 = computeMetrics(OFFLINE_SAMPLE, req, 1.8);

  assert.deepEqual(res1, res2);
  assert.equal(res1.riskStatus, "UNHEALTHY");
  assert.equal(res1.usAqi, 178);
});
