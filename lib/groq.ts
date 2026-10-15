// Server-only AI client: Groq (primary) with optional Google Gemini fallback.
// Plain fetch, no vendor SDKs.
import { GEMINI_MODEL, geminiEndpoint, geminiModel, GROQ_ENDPOINT, GROQ_TIMEOUT_MS, groqModel, isReasoningModel, type AiProvider } from "./config";
import { hourToSlot, isDaytime, slotToHour } from "./calc";
import { AiInsightSchema, type AiInsightRaw } from "./schemas";
import type { AiErrorCode, AiInsight, Metrics, Mode, RescheduleItem } from "./types";

export const SYSTEM_PROMPT = `You are SmogShield-LHR, an air-quality health assistant for Lahore residents. You give practical, non-medical guidance.

Rules:
1. Respond with ONE JSON object only, with exactly these keys: "executiveSummary", "rescheduledPlan", "homeVentilationAdvice", "whatsappFamilyAlert".
2. Treat every number you are given as fact. Never invent or recalculate AQI, PM2.5, cigarette equivalence, or the risk level.
3. "rescheduledPlan": an array of 1 to 5 items, one per outdoor activity in userRoutine. Each item is {"originalSlot": "HH:00", "optimizedSlot": "HH:00", "reason": "<one sentence>"}. optimizedSlot MUST be between 06:00 and 21:00 and should prefer the given safeWindows.
4. "executiveSummary": at most 3 sentences. Mention winter thermal inversion where relevant.
5. "homeVentilationAdvice": include specific clock times for opening windows and for running HEPA air filtration. At most 400 characters.
6. "whatsappFamilyAlert": written in Roman Urdu, 600 characters or fewer. Bold text uses single asterisks like *this*, never double asterisks.
7. Do not give medical diagnoses. Advise seeing a doctor if symptoms such as breathlessness or chest pain appear.
8. Output JSON only: no markdown, no commentary.`;

export interface PromptInput {
  zone: string;
  mode: string;
  hoursOutside: number;
  userRoutine: string;
  riskStatus: Metrics["riskStatus"];
  usAqi: number;
  pm25: number;
  whoMultiple: number;
  cigarettes: number;
  hourlyPm25: string;
  safeWindows: string[];
  peakSpikes: string[];
}

export function buildPromptInput(
  metrics: Metrics,
  request: { hoursOutside: number; userRoutine: string },
  zoneLabel: string,
  mode: Mode,
): PromptInput {
  return {
    zone: zoneLabel,
    mode: mode.label,
    hoursOutside: request.hoursOutside,
    userRoutine: request.userRoutine,
    riskStatus: metrics.riskStatus,
    usAqi: metrics.usAqi,
    pm25: metrics.pm25,
    whoMultiple: metrics.whoMultiple,
    cigarettes: metrics.cigarettes,
    hourlyPm25: metrics.hourly
      .filter((h) => isDaytime(h.hour) && h.pm25 !== null)
      .map((h) => `${String(h.hour).padStart(2, "0")}:${Math.round(h.pm25 as number)}`)
      .join(" "),
    safeWindows: metrics.safeWindows.map((s) => hourToSlot(s.hour)),
    peakSpikes: metrics.peakSpikes.map((p) => hourToSlot(p.hour)),
  };
}

export function buildGroqPayload(input: PromptInput, model: string = groqModel()) {
  const reasoning = isReasoningModel(model);
  return {
    model,
    temperature: 0.1,
    // gpt-oss spends tokens reasoning before the JSON; 1200 leaves it empty.
    max_tokens: reasoning ? 3000 : 1200,
    ...(reasoning ? { reasoning_effort: "low" as const } : {}),
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: JSON.stringify(input) },
    ],
  };
}

export function buildGeminiPayload(input: PromptInput) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" },
  };
}

/** round((orig − opt) / orig × 100); 0 if either is null or orig is 0 (design.md §Reduction Percent). */
export function reductionPercent(metrics: Metrics, originalSlot: string, optimizedSlot: string): number {
  const at = (slot: string) => metrics.hourly.find((h) => h.hour === slotToHour(slot))?.pm25 ?? null;
  const orig = at(originalSlot);
  const opt = at(optimizedSlot);
  if (orig === null || opt === null || orig === 0) return 0;
  return Math.round(((orig - opt) / orig) * 100);
}

/** Post-processing (design.md §Post-Processing). Returns null if every plan item was dropped. */
export function postProcess(raw: AiInsightRaw, metrics: Metrics): AiInsight | null {
  const plan: RescheduleItem[] = raw.rescheduledPlan
    .filter((item) => isDaytime(slotToHour(item.optimizedSlot)))
    .map((item) => ({
      originalSlot: item.originalSlot,
      optimizedSlot: item.optimizedSlot,
      reason: item.reason,
      reductionPercent: reductionPercent(metrics, item.originalSlot, item.optimizedSlot),
    }));
  if (plan.length === 0) return null;
  return {
    executiveSummary: raw.executiveSummary,
    rescheduledPlan: plan,
    homeVentilationAdvice: raw.homeVentilationAdvice,
    whatsappFamilyAlert: raw.whatsappFamilyAlert.replace(/\*{2,}/g, "*"),
  };
}



export interface InsightResult {
  ai: AiInsight | null;
  aiError?: AiErrorCode;
  /** Time spent in the provider call that produced the answer (or the last attempt). */
  latencyMs: number | null;
  /** Model / provider that produced `ai` (or the last one attempted). */
  model: string;
  provider: AiProvider;
}

interface Attempt {
  provider: AiProvider;
  model: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  /** Pulls the model's text out of the provider's response envelope. */
  extract: (envelope: unknown) => string | undefined;
}

/** Some small models wrap the object in an array; take the element that looks like an insight. */
function unwrap(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    return parsed.find((x) => x && typeof x === "object" && "executiveSummary" in x) ?? parsed;
  }
  return parsed;
}

async function attempt(a: Attempt, metrics: Metrics): Promise<Omit<InsightResult, "model" | "provider">> {
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(a.url, {
      method: "POST",
      headers: { ...a.headers, "Content-Type": "application/json" },
      body: a.body,
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const latencyMs = Math.round(performance.now() - t0);
    const name = (err as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { ai: null, aiError: "AI_TIMEOUT", latencyMs };
    console.error(`[ai] ${a.provider} network error`);
    return { ai: null, aiError: "AI_UPSTREAM_ERROR", latencyMs };
  }
  const latencyMs = Math.round(performance.now() - t0);

  if (!res.ok) {
    // Status only: never log the body (may echo request data) or the key.
    console.error(`[ai] ${a.provider} ${a.model} HTTP ${res.status}`);
    return { ai: null, aiError: "AI_UPSTREAM_ERROR", latencyMs };
  }

  let parsed: unknown;
  try {
    const content = a.extract(await res.json());
    if (typeof content !== "string") throw new Error("no content");
    parsed = unwrap(JSON.parse(content));
  } catch {
    return { ai: null, aiError: "AI_INVALID_JSON", latencyMs };
  }

  const validated = AiInsightSchema.safeParse(parsed);
  if (!validated.success) return { ai: null, aiError: "AI_SCHEMA_MISMATCH", latencyMs };
  const ai = postProcess(validated.data, metrics);
  if (!ai) return { ai: null, aiError: "AI_SCHEMA_MISMATCH", latencyMs };
  return { ai, latencyMs };
}

export async function fetchInsight(
  metrics: Metrics,
  request: { hoursOutside: number; userRoutine: string },
  zoneLabel: string,
  mode: Mode,
): Promise<InsightResult> {
  // Keys are read here, server-side only (R10.1).
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const input = buildPromptInput(metrics, request, zoneLabel, mode);

  const attempts: Attempt[] = [];
  if (groqKey) {
    const model = groqModel();
    attempts.push({
      provider: "Groq",
      model,
      url: GROQ_ENDPOINT,
      headers: { Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify(buildGroqPayload(input, model)),
      extract: (e) => (e as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content,
    });
  }
  if (geminiKey) {
    const gemModel = geminiModel();
    attempts.push({
      provider: "Google",
      model: gemModel,
      url: geminiEndpoint(gemModel),
      headers: { "x-goog-api-key": geminiKey },
      body: JSON.stringify(buildGeminiPayload(input)),
      // Skip "thought" parts; join the answer text.
      extract: (e) => {
        const parts = (e as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] })
          .candidates?.[0]?.content?.parts;
        const text = parts?.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
        return text || undefined;
      },
    });
  }

  if (attempts.length === 0) {
    return { ai: null, aiError: "AI_NOT_CONFIGURED", latencyMs: null, model: groqModel(), provider: "Groq" };
  }

  let last: InsightResult | null = null;
  for (const a of attempts) {
    const r = await attempt(a, metrics);
    last = { ...r, model: a.model, provider: a.provider };
    if (r.ai) return last;
    if (attempts.length > 1) console.warn(`[ai] ${a.provider} failed (${r.aiError}); trying next provider`);
  }
  return last!;
}
