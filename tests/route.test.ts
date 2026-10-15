import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/smog/route";
import { GET as getPresets } from "@/app/api/presets/route";
import { PRESETS } from "@/lib/presets";
import { aqiToBand } from "@/lib/bands";
import { makeOpenMeteoPayload } from "./fixtures";
import type { SmogResponse } from "@/lib/types";

const goodInsight = {
  executiveSummary: "Inversion traps PM2.5.",
  rescheduledPlan: [{ originalSlot: "08:00", optimizedSlot: "14:00", reason: "Midday mixing." }],
  homeVentilationAdvice: "Ventilate 13:00–15:00; HEPA overnight.",
  whatsappFamilyAlert: "**Alert** Aaj AQI zyada hai.",
};

const p1 = PRESETS[0];
const preset1Body = { zone: p1.zone, mode: p1.mode, hoursOutside: p1.hoursOutside, userRoutine: p1.userRoutine };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/smog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

type Route = { meteo?: () => Promise<Response>; groq?: () => Promise<Response> };

function stubUpstreams({ meteo, groq }: Route = {}) {
  const fn = vi.fn((url: string) => {
    if (url.startsWith("https://air-quality-api.open-meteo.com")) {
      return meteo ? meteo() : Promise.resolve(new Response(JSON.stringify(makeOpenMeteoPayload())));
    }
    if (url.startsWith("https://api.groq.com")) {
      return groq
        ? groq()
        : Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(goodInsight) } }] })));
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

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

describe("POST /api/smog — validation (R9.6)", () => {
  it("returns 400 INVALID_REQUEST with fieldErrors and makes zero fetch calls", async () => {
    const f = stubUpstreams();
    const res = await post({ zone: "riphah_johar", mode: "bike", hoursOutside: 15, userRoutine: "" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_REQUEST");
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["hoursOutside", "userRoutine"]);
    expect(f).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-JSON body", async () => {
    const f = stubUpstreams();
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.body).toBeDefined();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns 400 for GPS coordinates outside Lahore", async () => {
    const f = stubUpstreams();
    const res = await post({ ...preset1Body, zone: "custom_gps", customCoords: { lat: 24.86, lon: 67.0 } });
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("POST /api/smog — happy path", () => {
  it("returns the full SmogResponse shape", async () => {
    stubUpstreams();
    const res = await post(preset1Body);
    expect(res.status).toBe(200);
    const body = (await res.json()) as SmogResponse;
    expect(body.metrics.riskStatus).toBe(aqiToBand(body.metrics.usAqi));
    expect(body.metrics.safeWindows).toHaveLength(3);
    expect(body.metrics.peakSpikes).toHaveLength(3);
    expect(body.metrics.hourly).toHaveLength(24);
    expect(body.ai!.rescheduledPlan[0].reductionPercent).toBe(67);
    expect(body.ai!.whatsappFamilyAlert).toBe("*Alert* Aaj AQI zyada hai.");
    expect(body.aiError).toBeUndefined();
    expect(body.meta).toMatchObject({
      model: "openai/gpt-oss-20b",
      provider: "Groq",
      dataSource: "live",
      zone: "riphah_johar",
      zoneLabel: "Johar Town / Riphah Campus",
    });
    expect(Number.isInteger(body.meta.latencyMs)).toBe(true);
    expect(new Date(body.meta.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("uses rounded GPS coordinates and a derived label for custom_gps", async () => {
    const f = stubUpstreams();
    const res = await post({ ...preset1Body, zone: "custom_gps", customCoords: { lat: 31.520412, lon: 74.358739 } });
    const body = (await res.json()) as SmogResponse;
    expect(res.status).toBe(200);
    expect(body.meta.zone).toBe("custom_gps");
    expect(body.meta.coords).toEqual({ lat: 31.52, lon: 74.359 });
    expect(body.meta.zoneLabel).toBe("Live location near Gulberg / Kalma Chowk");
    const meteoUrl = new URL(f.mock.calls[0][0] as string);
    expect(meteoUrl.searchParams.get("latitude")).toBe("31.52");
  });
});

describe("POST /api/smog — degraded paths (R9.1, R9.3)", () => {
  it("still returns 200 with metrics when Groq fails", async () => {
    stubUpstreams({ groq: async () => new Response("rate limited", { status: 429 }) });
    const res = await post(preset1Body);
    expect(res.status).toBe(200);
    const body = (await res.json()) as SmogResponse;
    expect(body.ai).toBeNull();
    expect(body.aiError).toBe("AI_UPSTREAM_ERROR");
    expect(body.metrics.usAqi).toBe(178);
  });

  it("returns AI_NOT_CONFIGURED with latencyMs null when the key is unset", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const f = stubUpstreams();
    const body = (await (await post(preset1Body)).json()) as SmogResponse;
    expect(body.aiError).toBe("AI_NOT_CONFIGURED");
    expect(body.meta.latencyMs).toBeNull();
    expect(f.mock.calls.some(([u]) => String(u).includes("groq"))).toBe(false);
  });

  it("falls back to the offline sample when Open-Meteo fails", async () => {
    stubUpstreams({ meteo: () => Promise.reject(new TypeError("fetch failed")) });
    const body = (await (await post(preset1Body)).json()) as SmogResponse;
    expect(body.meta.dataSource).toBe("offline_sample");
    expect(body.metrics.hourly).toHaveLength(24);
  });

  it("never leaks the API key in the response", async () => {
    stubUpstreams({ groq: async () => new Response("bad key gsk_test_key", { status: 401 }) });
    const text = await (await post(preset1Body)).text();
    expect(text).not.toContain("gsk_test_key");
  });
});

describe("GET /api/presets", () => {
  it("returns presets, zones and modes", async () => {
    const body = await (await getPresets()).json();
    expect(body.presets).toHaveLength(3);
    expect(Object.keys(body.zones)).toContain("riphah_johar");
    expect(Object.keys(body.modes)).toEqual(["bike", "walk", "car", "elder_asthma"]);
    expect(body.model).toBe("openai/gpt-oss-20b");
  });
});
