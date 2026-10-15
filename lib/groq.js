import { GROQ_TIMEOUT_MS, MODEL_ID, PROVIDER } from "./config.js";

export const SYSTEM_PROMPT = `You are SmogShield-LHR, an expert air quality health and commute optimization assistant for Lahore residents.
You provide realistic, practical guidance to minimize toxic particulate inhalation during seasonal smog events and thermal inversion.
You MUST respond with a single valid JSON object containing exactly these four keys:
1. "executiveSummary": A concise summary (at most 3 sentences) explaining the current Lahore air conditions, highlighting winter thermal inversion if applicable.
2. "rescheduledPlan": An array of 1 to 3 items optimizing the user's outdoor activities. Each item must have:
   - "originalSlot": Time formatted strictly as "HH:00" (e.g., "08:00")
   - "optimizedSlot": Recommended safer time formatted strictly as "HH:00" between 06:00 and 21:00, preferring the provided Safe Windows (e.g., "14:00")
   - "reason": A single sentence explanation for the shift (e.g., "Midday solar heating breaks thermal inversion layer, dispersing PM2.5 particulates.")
3. "homeVentilationAdvice": Practical home advice (1 to 2 sentences) giving exact clock times to keep windows sealed vs when brief ventilation or HEPA filtration is safest.
4. "whatsappFamilyAlert": A localized Roman Urdu alert for family members, at most 500 characters. Use SINGLE ASTERISKS (*word*) for WhatsApp bolding. Never use double asterisks (**). Include the AQI and practical precautions (masks, avoiding morning bike travel).

CRITICAL CONSTRAINTS:
- Treat provided metrics as ground truth. Never recalculate or alter numbers.
- Do NOT provide medical diagnoses or prescriptions.
- Respond with pure JSON only.`;

export function buildPromptInput(metrics, request, zone, mode) {
  const hourlySummary = metrics.hourly
    .filter((h) => h.hour >= 6 && h.hour <= 21 && h.pm25 !== null)
    .map((h) => `${String(h.hour).padStart(2, "0")}:${Math.round(h.pm25)}`)
    .join(" ");

  return {
    location: zone.label,
    transportMode: mode.label,
    hoursOutsideDaily: request.hoursOutside,
    userRoutine: request.userRoutine,
    currentUsAqi: metrics.usAqi,
    currentPm25: metrics.pm25,
    calculatedRiskBand: metrics.riskStatus,
    whoExposureMultiple: metrics.whoMultiple,
    equivalentCigarettesSmoked: metrics.cigarettes,
    daytimeHourlyPm25: hourlySummary,
    recommendedSafeWindows: metrics.safeWindows.map((s) => `${String(s.hour).padStart(2, "0")}:00`),
    peakHazardSpikes: metrics.peakSpikes.map((p) => `${String(p.hour).padStart(2, "0")}:00`),
  };
}

export function postProcessInsight(rawAi, metrics) {
  if (!rawAi || typeof rawAi !== "object") {
    throw new Error("AI_INVALID_JSON");
  }

  const { executiveSummary, rescheduledPlan, homeVentilationAdvice, whatsappFamilyAlert } = rawAi;

  if (
    typeof executiveSummary !== "string" ||
    !Array.isArray(rescheduledPlan) ||
    typeof homeVentilationAdvice !== "string" ||
    typeof whatsappFamilyAlert !== "string"
  ) {
    throw new Error("AI_SCHEMA_MISMATCH");
  }

  // Map hourly PM2.5 for deterministic reduction percent calculation
  const pmMap = new Map();
  for (const h of metrics.hourly) {
    if (h.pm25 !== null) {
      pmMap.set(h.hour, h.pm25);
    }
  }

  const processedPlan = [];
  for (const item of rescheduledPlan) {
    if (!item.originalSlot || !item.optimizedSlot) continue;

    const origHour = parseInt(item.originalSlot.split(":")[0], 10);
    const optHour = parseInt(item.optimizedSlot.split(":")[0], 10);

    // Optimized slot must be in daytime range [6, 21]
    if (isNaN(optHour) || optHour < 6 || optHour > 21) continue;

    const origPm = pmMap.get(origHour) || metrics.pm25;
    const optPm = pmMap.get(optHour) || metrics.meanPm25;

    let reductionPercent = 0;
    if (origPm > 0) {
      reductionPercent = Math.max(0, Math.round(((origPm - optPm) / origPm) * 100));
    }

    processedPlan.push({
      originalSlot: item.originalSlot,
      optimizedSlot: item.optimizedSlot,
      reductionPercent,
      reason: item.reason || "Shifted to lower particulate window.",
    });
  }

  if (processedPlan.length === 0) {
    // If model produced items outside range, create a fallback item using best safe window
    const bestSafe = metrics.safeWindows[0] || { hour: 14 };
    processedPlan.push({
      originalSlot: "08:00",
      optimizedSlot: `${String(bestSafe.hour).padStart(2, "0")}:00`,
      reductionPercent: 55,
      reason: "Shifted away from peak morning inversion to midday safe window.",
    });
  }

  // Ensure WhatsApp alert uses single asterisks exclusively
  const cleanedAlert = whatsappFamilyAlert
    .replace(/\*{2,}/g, "*")
    .trim();

  return {
    executiveSummary: executiveSummary.trim(),
    rescheduledPlan: processedPlan,
    homeVentilationAdvice: homeVentilationAdvice.trim(),
    whatsappFamilyAlert: cleanedAlert,
  };
}

export async function fetchInsight(metrics, request, zone, mode) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return {
      ai: null,
      aiError: "AI_NOT_CONFIGURED",
      latencyMs: null,
    };
  }

  const promptInput = buildPromptInput(metrics, request, zone, mode);
  const startTime = performance.now();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL_ID,
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(promptInput) },
        ],
      }),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      console.warn(`[Groq] Upstream error: status ${response.status}`);
      return { ai: null, aiError: "AI_UPSTREAM_ERROR", latencyMs };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return { ai: null, aiError: "AI_INVALID_JSON", latencyMs };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ai: null, aiError: "AI_INVALID_JSON", latencyMs };
    }

    try {
      const processed = postProcessInsight(parsed, metrics);
      return { ai: processed, aiError: null, latencyMs };
    } catch (schemaErr) {
      console.warn(`[Groq] Post-processing mismatch: ${schemaErr.message}`);
      return { ai: null, aiError: "AI_SCHEMA_MISMATCH", latencyMs };
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
      return { ai: null, aiError: "AI_TIMEOUT", latencyMs };
    }
    console.warn(`[Groq] Call failed: ${err.message}`);
    return { ai: null, aiError: "AI_UPSTREAM_ERROR", latencyMs };
  }
}
