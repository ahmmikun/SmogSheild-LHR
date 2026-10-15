import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOpenMeteoUrl, fetchTelemetry, offlineTelemetry, parseOpenMeteo } from "@/lib/openMeteo";
import { OFFLINE_SAMPLE_RAW } from "@/lib/offlineSample";
import { ZONES } from "@/lib/zones";
import { FIXTURE_PM25, makeOpenMeteoPayload } from "./fixtures";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

function mockFetch(impl: (...args: any[]) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const okJson = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildOpenMeteoUrl", () => {
  it.each(Object.values(ZONES))("builds the R4.1 query for $id", (zone) => {
    const url = new URL(buildOpenMeteoUrl(zone));
    expect(url.origin + url.pathname).toBe("https://air-quality-api.open-meteo.com/v1/air-quality");
    expect(url.searchParams.get("latitude")).toBe(String(zone.lat));
    expect(url.searchParams.get("longitude")).toBe(String(zone.lon));
    expect(url.searchParams.get("current")).toBe("us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide");
    expect(url.searchParams.get("hourly")).toBe("us_aqi,pm2_5,pm10,uv_index");
    expect(url.searchParams.get("timezone")).toBe("Asia/Karachi");
    expect(url.searchParams.get("forecast_days")).toBe("1");
  });
});

describe("parseOpenMeteo", () => {
  it("maps a valid payload to Telemetry", () => {
    const t = parseOpenMeteo(makeOpenMeteoPayload());
    expect(t).not.toBeNull();
    expect(t!.current).toEqual({ time: "2026-10-15T09:00", usAqi: 178, pm25: 165, pm10: 240, co: 1450, no2: 62 });
    expect(t!.hourly).toHaveLength(24);
    expect(t!.hourly[8]).toMatchObject({ hour: 8, pm25: 188 });
  });

  it("keeps null hours as null", () => {
    const pm = [...FIXTURE_PM25];
    pm[2] = null;
    expect(parseOpenMeteo(makeOpenMeteoPayload(pm))!.hourly[2].pm25).toBeNull();
  });

  it("rejects a missing current field", () => {
    const p: any = makeOpenMeteoPayload();
    delete p.current.nitrogen_dioxide;
    expect(parseOpenMeteo(p)).toBeNull();
  });

  it("rejects fewer than 24 hours", () => {
    const p: any = makeOpenMeteoPayload();
    p.hourly.time = p.hourly.time.slice(0, 23);
    expect(parseOpenMeteo(p)).toBeNull();
  });

  it("rejects fewer than 12 non-null pm2_5 values", () => {
    const pm = FIXTURE_PM25.map((v, i) => (i < 13 ? null : v));
    expect(parseOpenMeteo(makeOpenMeteoPayload(pm))).toBeNull();
  });

  it("rejects a day with all night hours but only 2 daytime values", () => {
    // 8 night + 2 daytime = 10 non-null. (With 24 h, ≥12 non-null already
    // implies ≥4 daytime values, so the daytime guard is defence in depth.)
    const pm: (number | null)[] = Array(24).fill(null);
    [0, 1, 2, 3, 4, 5, 22, 23, 6, 7].forEach((h) => (pm[h] = 40));
    expect(parseOpenMeteo(makeOpenMeteoPayload(pm))).toBeNull();
  });

  it("accepts exactly 12 non-null values", () => {
    const pm: (number | null)[] = Array(24).fill(null);
    for (let h = 6; h < 18; h++) pm[h] = 40;
    expect(parseOpenMeteo(makeOpenMeteoPayload(pm))).not.toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseOpenMeteo(null)).toBeNull();
    expect(parseOpenMeteo("nope")).toBeNull();
  });
});

describe("offline sample", () => {
  it("is a real, valid recorded Open-Meteo response", () => {
    expect(OFFLINE_SAMPLE_RAW.timezone).toBe("Asia/Karachi");
    const t = offlineTelemetry();
    expect(t.hourly).toHaveLength(24);
    expect(t.hourly.filter((h) => h.pm25 !== null).length).toBeGreaterThanOrEqual(12);
  });
});

describe("fetchTelemetry", () => {
  const coords = ZONES.riphah_johar;

  it("returns live data on a valid 200", async () => {
    const f = mockFetch(() => okJson(makeOpenMeteoPayload()));
    const r = await fetchTelemetry(coords);
    expect(r.dataSource).toBe("live");
    expect(r.telemetry.current.usAqi).toBe(178);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(buildOpenMeteoUrl(coords));
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("falls back on timeout", async () => {
    mockFetch(() => Promise.reject(new DOMException("timed out", "TimeoutError")));
    const r = await fetchTelemetry(coords);
    expect(r.dataSource).toBe("offline_sample");
    expect(r.telemetry).toEqual(offlineTelemetry());
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("timed out"));
  });

  it("falls back on non-200", async () => {
    mockFetch(() => Promise.resolve(new Response("busy", { status: 503 })));
    expect((await fetchTelemetry(coords)).dataSource).toBe("offline_sample");
  });

  it("falls back on network error", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect((await fetchTelemetry(coords)).dataSource).toBe("offline_sample");
  });

  it("falls back on malformed JSON body", async () => {
    mockFetch(() => Promise.resolve(new Response("<html>", { status: 200 })));
    expect((await fetchTelemetry(coords)).dataSource).toBe("offline_sample");
  });

  it("falls back when fewer than 12 pm2_5 values", async () => {
    const pm = FIXTURE_PM25.map((v, i) => (i < 13 ? null : v)); // 11 non-null
    mockFetch(() => okJson(makeOpenMeteoPayload(pm)));
    expect((await fetchTelemetry(coords)).dataSource).toBe("offline_sample");
  });
});
