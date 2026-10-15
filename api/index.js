import express from "express";
import fs from "fs";
import path from "path";
import { MODEL_ID, PROVIDER } from "../lib/config.js";
import { MODES, ZONES, PRESETS } from "../lib/zones.js";
import { computeMetrics } from "../lib/calc.js";
import { fetchTelemetry } from "../lib/openMeteo.js";
import { fetchInsight } from "../lib/groq.js";

export const app = express();

app.use(express.json({ limit: "10kb" }));

// Validate request payload
export function validateSmogRequest(body) {
  const fieldErrors = {};

  if (!body || typeof body !== "object") {
    return { valid: false, fieldErrors: { body: ["Request body must be a JSON object"] } };
  }

  const { zone, mode, hoursOutside, userRoutine, customCoords } = body;

  if (zone === "custom_gps") {
    if (!customCoords || typeof customCoords.lat !== "number" || typeof customCoords.lon !== "number") {
      fieldErrors.zone = ["Custom GPS coordinates required (numeric lat and lon)"];
    }
  } else if (!zone || !ZONES[zone]) {
    fieldErrors.zone = [`Invalid zone. Must be one of: ${Object.keys(ZONES).join(", ")}`];
  }

  if (!mode || !MODES[mode]) {
    fieldErrors.mode = [`Invalid mode. Must be one of: ${Object.keys(MODES).join(", ")}`];
  }

  const hours = Number(hoursOutside);
  if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
    fieldErrors.hoursOutside = ["Hours outside must be an integer between 1 and 12"];
  }

  if (typeof userRoutine !== "string" || userRoutine.trim().length < 3 || userRoutine.trim().length > 500) {
    fieldErrors.userRoutine = ["Routine description must be between 3 and 500 characters"];
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

// Preset definitions endpoint for UI
app.get("/api/presets", (req, res) => {
  res.json({ presets: PRESETS, zones: ZONES, modes: MODES });
});

// Main Smog Analysis Endpoint
app.post("/api/smog", async (req, res) => {
  const { valid, fieldErrors } = validateSmogRequest(req.body);

  if (!valid) {
    return res.status(400).json({
      error: "INVALID_REQUEST",
      fieldErrors,
    });
  }

  const { zone: zoneId, mode: modeId, hoursOutside, userRoutine, customCoords, customLabel } = req.body;
  
  let zone;
  if (zoneId === "custom_gps" && customCoords) {
    zone = {
      id: "custom_gps",
      label: customLabel || "Live GPS Location (Lahore)",
      lat: Number(customCoords.lat),
      lon: Number(customCoords.lon),
    };
  } else {
    zone = ZONES[zoneId];
  }

  const mode = MODES[modeId];

  try {
    // 1. Fetch live telemetry from Open-Meteo (with offline sample fallback)
    const { telemetry, dataSource } = await fetchTelemetry(zone);

    // 2. Compute deterministic health & exposure metrics
    const metrics = computeMetrics(
      telemetry,
      { hoursOutside: Number(hoursOutside), userRoutine: userRoutine.trim() },
      mode.multiplier
    );

    // 3. Invoke 8B open-weight LLM on Groq
    const { ai, aiError, latencyMs } = await fetchInsight(
      metrics,
      { hoursOutside: Number(hoursOutside), userRoutine: userRoutine.trim() },
      zone,
      mode
    );

    // 4. Return structured SmogResponse
    const responsePayload = {
      metrics,
      ai,
      ...(aiError ? { aiError } : {}),
      meta: {
        model: MODEL_ID,
        provider: PROVIDER,
        latencyMs,
        dataSource,
        zone: zoneId,
        zoneLabel: zone.label,
        generatedAt: new Date().toISOString(),
      },
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error("[Route] Unhandled server error:", err);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while processing air quality analytics.",
    });
  }
});

// Vercel Serverless Fallback Static Handlers (guarantees zero 500 errors on Lambda)
app.get("/", (req, res) => {
  try {
    const htmlPath = path.join(process.cwd(), "public", "index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err) {
    console.error("[Static Fallback] Failed reading index.html:", err);
    return res.status(500).send("SmogShield-LHR Command Center: Error loading dashboard.");
  }
});

app.get("/style.css", (req, res) => {
  try {
    const cssPath = path.join(process.cwd(), "public", "style.css");
    const css = fs.readFileSync(cssPath, "utf8");
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.send(css);
  } catch (err) {
    return res.status(404).send("style.css not found");
  }
});

app.get("/app.js", (req, res) => {
  try {
    const jsPath = path.join(process.cwd(), "public", "app.js");
    const js = fs.readFileSync(jsPath, "utf8");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return res.send(js);
  } catch (err) {
    return res.status(404).send("app.js not found");
  }
});

export default app;
