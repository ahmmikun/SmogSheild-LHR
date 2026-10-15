// GET /api/presets — static catalogue of presets, zones and modes.
// Kept from v1 as a documented extension to R10.5 (read-only, no secrets).
import { MODEL_ID, PROVIDER } from "@/lib/config";
import { PRESETS } from "@/lib/presets";
import { MODES, ZONES } from "@/lib/zones";

export async function GET(): Promise<Response> {
  return Response.json({ presets: PRESETS, zones: ZONES, modes: MODES, model: MODEL_ID, provider: PROVIDER });
}
