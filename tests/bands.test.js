import test from "node:test";
import assert from "node:assert/strict";
import { aqiToBand } from "../lib/bands.js";

test("aqiToBand: maps boundary AQI values accurately to EPA bands", () => {
  assert.equal(aqiToBand(0), "GOOD");
  assert.equal(aqiToBand(50), "GOOD");
  assert.equal(aqiToBand(51), "MODERATE");
  assert.equal(aqiToBand(100), "MODERATE");
  assert.equal(aqiToBand(101), "USG");
  assert.equal(aqiToBand(150), "USG");
  assert.equal(aqiToBand(151), "UNHEALTHY");
  assert.equal(aqiToBand(200), "UNHEALTHY");
  assert.equal(aqiToBand(201), "VERY_UNHEALTHY");
  assert.equal(aqiToBand(300), "VERY_UNHEALTHY");
  assert.equal(aqiToBand(301), "HAZARDOUS");
  assert.equal(aqiToBand(500), "HAZARDOUS");
});

test("aqiToBand: handles negative and non-numeric inputs safely", () => {
  assert.equal(aqiToBand(-10), "GOOD");
  assert.equal(aqiToBand(null), "GOOD");
  assert.equal(aqiToBand(undefined), "GOOD");
});
