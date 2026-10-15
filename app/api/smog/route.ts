// POST /api/smog — validate → Open-Meteo → deterministic metrics → Groq 8B.
// No `runtime` / `dynamic` exports: Next 16 with cacheComponents rejects them.
// Node.js is the default runtime and POST handlers already run per request.
import { computeMetrics } from "@/lib/calc";
import { fetchInsight } from "@/lib/groq";
import { resolveLocation } from "@/lib/location";
import { fetchTelemetry } from "@/lib/openMeteo";
import { SmogRequestSchema, toFieldErrors } from "@/lib/schemas";
import type { InvalidRequestResponse, SmogResponse } from "@/lib/types";
import { MODES } from "@/lib/zones";

const invalid = (fieldErrors: Record<string, string[]>) =>
  Response.json({ error: "INVALID_REQUEST", fieldErrors } satisfies InvalidRequestResponse, { status: 400 });

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid({ body: ["Request body must be valid JSON"] });
  }

  const parsed = SmogRequestSchema.safeParse(body);
  if (!parsed.success) return invalid(toFieldErrors(parsed.error));

  const req = parsed.data;
  const mode = MODES[req.mode];
  const location = resolveLocation(req);

  try {
    const { telemetry, dataSource } = await fetchTelemetry(location.coords);
    const metrics = computeMetrics(telemetry, req, mode.multiplier);
    const { ai, aiError, latencyMs, model, provider } = await fetchInsight(metrics, req, location.label, mode);

    const response: SmogResponse = {
      metrics,
      ai,
      ...(aiError ? { aiError } : {}),
      meta: {
        model,
        provider,
        latencyMs,
        dataSource,
        zone: req.zone,
        zoneLabel: location.label,
        coords: location.coords,
        generatedAt: new Date().toISOString(),
      },
    };
    return Response.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/smog] unexpected failure:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
