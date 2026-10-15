import { z } from "zod";
import { ALL_ZONE_IDS, isWithinLahore, MODE_IDS } from "./zones";

/** "HH:00", 00–23. */
const slot = z.string().regex(/^([01]\d|2[0-3]):00$/, "Slot must be formatted HH:00");

export const AiInsightSchema = z
  .object({
    executiveSummary: z.string().min(1).max(600),
    rescheduledPlan: z
      .array(
        z.object({
          originalSlot: slot,
          optimizedSlot: slot,
          reason: z.string().min(1).max(200),
        }),
      )
      .min(1)
      .max(5),
    homeVentilationAdvice: z.string().min(1).max(400),
    whatsappFamilyAlert: z.string().min(1).max(600),
  })
  .strip(); // drops riskStatus / reductionPercent etc. supplied by the model (D1, D10)

export type AiInsightRaw = z.infer<typeof AiInsightSchema>;

export const HOURS_MIN = 1;
export const HOURS_MAX = 12;
export const ROUTINE_MIN = 3;
export const ROUTINE_MAX = 500;

const CoordsSchema = z.object({
  lat: z.number().finite(),
  lon: z.number().finite(),
});

/**
 * Request schema. Extends design.md's 5-zone enum with the city-wide zones and
 * a `custom_gps` zone that must carry in-bounds Lahore coordinates.
 */
export const SmogRequestSchema = z
  .object({
    zone: z.enum([...ALL_ZONE_IDS, "custom_gps"], { error: "Choose a Lahore zone" }),
    mode: z.enum(MODE_IDS, { error: "Choose how you travel" }),
    hoursOutside: z
      .number({ error: "Enter hours outside as a number" })
      .int({ error: "Hours outside must be a whole number" })
      .min(HOURS_MIN, { error: `Hours outside must be between ${HOURS_MIN} and ${HOURS_MAX}` })
      .max(HOURS_MAX, { error: `Hours outside must be between ${HOURS_MIN} and ${HOURS_MAX}` }),
    userRoutine: z
      .string({ error: "Describe your routine" })
      .trim()
      .min(ROUTINE_MIN, { error: `Describe your routine in at least ${ROUTINE_MIN} characters` })
      .max(ROUTINE_MAX, { error: `Routine must be ${ROUTINE_MAX} characters or fewer` }),
    customCoords: CoordsSchema.optional(),
  })
  .superRefine((req, ctx) => {
    if (req.zone !== "custom_gps") return;
    if (!req.customCoords) {
      ctx.addIssue({ code: "custom", path: ["zone"], message: "Live location needs GPS coordinates" });
    } else if (!isWithinLahore(req.customCoords.lat, req.customCoords.lon)) {
      ctx.addIssue({ code: "custom", path: ["zone"], message: "Your location is outside Lahore. Pick a zone instead." });
    }
  });

export type SmogRequestInput = z.infer<typeof SmogRequestSchema>;

/** Flattens zod issues into `{ field: [messages] }` for both the API (R9.6) and inline UI errors. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "body");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
