import test from "node:test";
import assert from "node:assert/strict";
import { app, validateSmogRequest } from "../server.js";

test("validateSmogRequest: rejects missing or invalid fields", () => {
  const emptyRes = validateSmogRequest({});
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.fieldErrors.zone);
  assert.ok(emptyRes.fieldErrors.mode);
  assert.ok(emptyRes.fieldErrors.hoursOutside);
  assert.ok(emptyRes.fieldErrors.userRoutine);

  // Out of bounds hours (>12)
  const oobHours = validateSmogRequest({
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 15,
    userRoutine: "Routine",
  });
  assert.equal(oobHours.valid, false);
  assert.ok(oobHours.fieldErrors.hoursOutside);

  // Short routine (<3 chars)
  const shortRoutine = validateSmogRequest({
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 4,
    userRoutine: "ab",
  });
  assert.equal(shortRoutine.valid, false);
  assert.ok(shortRoutine.fieldErrors.userRoutine);
});

test("validateSmogRequest: accepts valid inputs", () => {
  const valid = validateSmogRequest({
    zone: "riphah_johar",
    mode: "bike",
    hoursOutside: 5,
    userRoutine: "University commute on bike",
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.fieldErrors, {});
});

test("validateSmogRequest: accepts extended Lahore zones and custom GPS", () => {
  // Extended zone: Bahria Town
  const validExtended = validateSmogRequest({
    zone: "bahria",
    mode: "car",
    hoursOutside: 3,
    userRoutine: "Driving to office via Canal Road",
  });
  assert.equal(validExtended.valid, true);

  // Custom GPS with numeric coords
  const validGps = validateSmogRequest({
    zone: "custom_gps",
    customCoords: { lat: 31.4697, lon: 74.2728 },
    mode: "walk",
    hoursOutside: 2,
    userRoutine: "Walking to market in evening",
  });
  assert.equal(validGps.valid, true);

  // Custom GPS without coords should fail
  const invalidGps = validateSmogRequest({
    zone: "custom_gps",
    mode: "walk",
    hoursOutside: 2,
    userRoutine: "Walking to market in evening",
  });
  assert.equal(invalidGps.valid, false);
  assert.ok(invalidGps.fieldErrors.zone);
});

