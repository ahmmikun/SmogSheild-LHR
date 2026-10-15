import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MODEL_ID, PORT, PROVIDER } from "./lib/config.js";
import { MODES, ZONES, PRESETS } from "./lib/zones.js";
import { computeMetrics } from "./lib/calc.js";
import { fetchTelemetry } from "./lib/openMeteo.js";
import { fetchInsight } from "./lib/groq.js";

// Load .env.local first, fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security: limit body size to 10kb
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Validate request payload
export function validateSmogRequest(body) {
  const fieldErrors = {};

  if (!body || typeof body !== "object") {
    return { valid: false, fieldErrors: { body: ["Request body must be a JSON object"] } };
  }

  const { zone, mode, hoursOutside, userRoutine } = body;

  if (!zone || !ZONES[zone]) {
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

  const { zone: zoneId, mode: modeId, hoursOutside, userRoutine } = req.body;
  const zone = ZONES[zoneId];
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

// Catch-all: serve index.html for single-page app (compatible with Express 4 and 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Run server only if executed directly (enables clean testing via import)
if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌫️  SmogShield-LHR Command Center active on port ${PORT}`);
    console.log(`🌐  Local URL: http://localhost:${PORT}`);
    console.log(`🤖  AI Model: ${MODEL_ID} (Strict 8B via ${PROVIDER})`);
    console.log(`======================================================\n`);
  });
}
