import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPromptInput, fetchInsight, reductionPercent, SYSTEM_PROMPT } from "@/lib/groq";
import { computeMetrics } from "@/lib/calc";
import { MODES, ZONES } from "@/lib/zones";
import { makeTelemetry } from "./fixtures";

const metrics = computeMetrics(makeTelemetry(), { hoursOutside: 5 }, MODES.bike.multiplier);
const request = { hoursOutside: 5, userRoutine: "Bike to uni at 8 AM, walk at 6 PM" };
const zoneLabel = ZONES.riphah_johar.label;

const goodInsight = {
  executiveSummary: "Morning thermal inversion traps PM2.5 near the ground.",
  rescheduledPlan: [
    { originalSlot: "08:00", optimizedSlot: "14:00", reason: "Midday mixing layer disperses particulates." },
    { originalSlot: "18:00", optimizedSlot: "15:00", reason: "Lower PM2.5 before dusk." },
  ],
  homeVentilationAdvice: "Keep windows closed 06:00–10:00; ventilate 13:00–15:00; run HEPA overnight.",
  whatsappFamilyAlert: "**Smog Alert** Aaj AQI 178 hai (***Unhealthy***).",
};

function groqResponse(content: unknown, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }),
    { status },
  );
}

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const run = () => fetchInsight(metrics, request, zoneLabel, MODES.bike);

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "gsk_test_key");
  vi.stubEnv("GROQ_MODEL", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("request payload (R1.1, R6.1)", () => {
  it("calls Groq with openai/gpt-oss-20b, low reasoning effort and a 3000-token budget", async () => {
    const f = mockFetch(async () => groqResponse(goodInsight));
    await run();
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gsk_test_key");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.reasoning_effort).toBe("low");
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(3000);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(JSON.parse(body.messages[1].content)).toEqual(buildPromptInput(metrics, request, zoneLabel, MODES.bike));
  });

  it("builds a compact daytime PM2.5 string and slot lists", () => {
    const p = buildPromptInput(metrics, request, zoneLabel, MODES.bike);
    expect(p.hourlyPm25.startsWith("06:95 07:172 08:188")).toBe(true);
    expect(p.hourlyPm25.split(" ")).toHaveLength(16);
    expect(p.safeWindows).toEqual(["14:00", "15:00", "13:00"]);
    expect(p.peakSpikes).toEqual(["08:00", "21:00", "07:00"]);
    expect(p.riskStatus).toBe("UNHEALTHY");
  });
});

describe("post-processing", () => {
  it("normalises ** to * in the WhatsApp alert", async () => {
    mockFetch(async () => groqResponse(goodInsight));
    const { ai } = await run();
    expect(ai!.whatsappFamilyAlert).toBe("*Smog Alert* Aaj AQI 178 hai (*Unhealthy*).");
    expect(ai!.whatsappFamilyAlert).not.toContain("**");
  });

  it("recomputes reductionPercent from hourly data (08→14, 188→62 = 67)", async () => {
    mockFetch(async () =>
      groqResponse({ ...goodInsight, rescheduledPlan: [{ ...goodInsight.rescheduledPlan[0], reductionPercent: 5 }] }),
    );
    const { ai } = await run();
    expect(ai!.rescheduledPlan[0].reductionPercent).toBe(67);
  });

  it("strips any model-supplied riskStatus", async () => {
    mockFetch(async () => groqResponse({ ...goodInsight, riskStatus: "GOOD" }));
    const { ai } = await run();
    expect(ai).not.toHaveProperty("riskStatus");
  });

  it("drops items whose optimizedSlot is outside 06–21", async () => {
    mockFetch(async () =>
      groqResponse({
        ...goodInsight,
        rescheduledPlan: [goodInsight.rescheduledPlan[0], { originalSlot: "08:00", optimizedSlot: "03:00", reason: "Night." }],
      }),
    );
    const { ai } = await run();
    expect(ai!.rescheduledPlan).toHaveLength(1);
    expect(ai!.rescheduledPlan[0].optimizedSlot).toBe("14:00");
  });

  it("returns AI_SCHEMA_MISMATCH when every item is dropped", async () => {
    mockFetch(async () =>
      groqResponse({ ...goodInsight, rescheduledPlan: [{ originalSlot: "08:00", optimizedSlot: "23:00", reason: "x" }] }),
    );
    expect((await run()).aiError).toBe("AI_SCHEMA_MISMATCH");
  });

  it("reductionPercent is 0 when either hour is null or original is 0", () => {
    const m = { ...metrics, hourly: metrics.hourly.map((h) => (h.hour === 8 ? { ...h, pm25: null } : h.hour === 9 ? { ...h, pm25: 0 } : h)) };
    expect(reductionPercent(m, "08:00", "14:00")).toBe(0);
    expect(reductionPercent(m, "09:00", "14:00")).toBe(0);
  });
});

describe("error paths (R9.3, R9.5)", () => {
  it("AI_NOT_CONFIGURED when the key is missing, without calling fetch", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const f = mockFetch(async () => groqResponse(goodInsight));
    const r = await run();
    expect(r).toMatchObject({ ai: null, aiError: "AI_NOT_CONFIGURED", latencyMs: null });
    expect(f).not.toHaveBeenCalled();
  });

  it("AI_TIMEOUT on abort", async () => {
    mockFetch(() => Promise.reject(new DOMException("timeout", "TimeoutError")));
    const r = await run();
    expect(r.ai).toBeNull();
    expect(r.aiError).toBe("AI_TIMEOUT");
  });

  it.each([401, 429, 500])("AI_UPSTREAM_ERROR on HTTP %i", async (status) => {
    mockFetch(async () => new Response("nope", { status }));
    expect((await run()).aiError).toBe("AI_UPSTREAM_ERROR");
  });

  it("AI_UPSTREAM_ERROR on network failure", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect((await run()).aiError).toBe("AI_UPSTREAM_ERROR");
  });

  it("AI_INVALID_JSON when content is not JSON", async () => {
    mockFetch(async () => groqResponse("Sure! Here is your plan: ..."));
    expect((await run()).aiError).toBe("AI_INVALID_JSON");
  });

  it("AI_INVALID_JSON when the envelope has no content", async () => {
    mockFetch(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    expect((await run()).aiError).toBe("AI_INVALID_JSON");
  });

  it("AI_SCHEMA_MISMATCH when keys are missing", async () => {
    mockFetch(async () => groqResponse({ executiveSummary: "hi" }));
    expect((await run()).aiError).toBe("AI_SCHEMA_MISMATCH");
  });
});

describe("latency (R6.7)", () => {
  it("returns an integer latencyMs on success", async () => {
    mockFetch(async () => groqResponse(goodInsight));
    const { latencyMs, aiError } = await run();
    expect(aiError).toBeUndefined();
    expect(Number.isInteger(latencyMs)).toBe(true);
    expect(latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns an integer latencyMs on upstream error too", async () => {
    mockFetch(async () => new Response("x", { status: 500 }));
    expect(Number.isInteger((await run()).latencyMs)).toBe(true);
  });
});


describe("model selection and Gemini fallback", () => {
  const geminiResponse = (content: unknown, status = 200) =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "thinking…", thought: true }, { text: JSON.stringify(content) }] } }],
      }),
      { status },
    );

  it("honours GROQ_MODEL and uses the classic budget for non-reasoning models", async () => {
    vi.stubEnv("GROQ_MODEL", "allam-2-7b");
    const f = mockFetch(async () => groqResponse(goodInsight));
    const r = await run();
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe("allam-2-7b");
    expect(body.max_tokens).toBe(1200);
    expect(body).not.toHaveProperty("reasoning_effort");
    expect(r).toMatchObject({ model: "allam-2-7b", provider: "Groq" });
  });

  it("accepts an insight wrapped in an array (small-model quirk)", async () => {
    mockFetch(async () => groqResponse([{ zone: "echo" }, goodInsight]));
    expect((await run()).ai).not.toBeNull();
  });

  it("reports the Groq model and provider on success", async () => {
    mockFetch(async () => groqResponse(goodInsight));
    expect(await run()).toMatchObject({ model: "openai/gpt-oss-20b", provider: "Groq" });
  });

  it("falls back to gemini-3.8-flash when Groq fails and GEMINI_API_KEY is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gem_test_key");
    const f = vi.fn(async (url: string) =>
      url.includes("groq.com") ? new Response("down", { status: 503 }) : geminiResponse(goodInsight),
    );
    vi.stubGlobal("fetch", f);
    const r = await run();
    expect(r.ai).not.toBeNull();
    expect(r).toMatchObject({ model: "gemini-3.8-flash", provider: "Google" });
    const [url, init] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gem_test_key");
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
  });

  it("does not call Gemini when Groq succeeds", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gem_test_key");
    const f = mockFetch(async () => groqResponse(goodInsight));
    await run();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("uses Gemini alone when only GEMINI_API_KEY is set", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gem_test_key");
    const f = mockFetch(async () => geminiResponse(goodInsight));
    const r = await run();
    expect(f).toHaveBeenCalledTimes(1);
    expect(r.provider).toBe("Google");
  });

  it("returns the last error when both providers fail", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gem_test_key");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("groq.com") ? new Response("x", { status: 429 }) : geminiResponse({ nope: 1 }))));
    expect(await run()).toMatchObject({ ai: null, aiError: "AI_SCHEMA_MISMATCH", provider: "Google" });
  });
});
