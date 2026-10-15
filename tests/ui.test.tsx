import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { CopyButton } from "@/components/CopyButton";
import { computeMetrics } from "@/lib/calc";
import { MODES } from "@/lib/zones";
import { makeTelemetry } from "./fixtures";
import type { SmogResponse } from "@/lib/types";

const metrics = computeMetrics(makeTelemetry(), { hoursOutside: 5 }, MODES.bike.multiplier);

function smogResponse(overrides: Partial<SmogResponse> = {}): SmogResponse {
  return {
    metrics,
    ai: {
      executiveSummary: "Morning inversion traps PM2.5.",
      rescheduledPlan: [{ originalSlot: "08:00", optimizedSlot: "14:00", reductionPercent: 67, reason: "Midday mixing." }],
      homeVentilationAdvice: "Ventilate 13:00–15:00.",
      whatsappFamilyAlert: "*Smog Alert* Aaj AQI 178 hai.",
    },
    meta: {
      model: "llama-3.1-8b-instant",
      provider: "Groq",
      latencyMs: 412,
      dataSource: "live",
      zone: "riphah_johar",
      zoneLabel: "Johar Town / Riphah Campus",
      coords: { lat: 31.4697, lon: 74.2728 },
      generatedAt: "2026-10-15T09:00:00Z",
    },
    ...overrides,
  };
}

function mockApi(body: unknown = smogResponse(), status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const runButton = () => screen.getByRole("button", { name: /run ai smog exposure analysis/i });

beforeEach(() => {
  document.documentElement.classList.add("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initial state", () => {
  it("applies R2.6 defaults and shows LATENCY: — in the badge", () => {
    mockApi();
    render(<Home />);
    expect(screen.getByRole("radio", { name: "Johar Town" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /motorbike/i })).toBeChecked();
    expect(screen.getByLabelText(/hours outside/i)).toHaveValue(4);
    expect(screen.getByLabelText(/describe your day/i)).toHaveValue("");
    expect(screen.getByTestId("compliance-badge")).toHaveTextContent(
      "MODEL: openai/gpt-oss-20b | PROVIDER: Groq | LATENCY: —",
    );
    expect(runButton()).toBeDisabled(); // empty routine
    expect(screen.getByText(/choose a preset or run an analysis/i)).toBeInTheDocument();
  });
});

describe("presets (R3)", () => {
  it("Preset 1 fills the fields, calls fetch once, and renders results", async () => {
    const user = userEvent.setup();
    const f = mockApi();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 1: bike commute/i }));

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/smog");
    expect(JSON.parse(init.body as string)).toEqual({
      zone: "riphah_johar",
      mode: "bike",
      hoursOutside: 5,
      userRoutine: "Depart on bike for university at 8 AM, return at 2 PM, evening walk on rooftop at 6 PM",
    });
    expect(screen.getByLabelText(/hours outside/i)).toHaveValue(5);

    expect(await screen.findByText("178")).toBeInTheDocument();
    expect(screen.getByTestId("compliance-badge")).toHaveTextContent("LATENCY: 412ms");
    expect(screen.getAllByText(/14:00/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /PM2\.5 \d+ micrograms|no data/ })).toHaveLength(24);
  });

  it("Preset 3 shows both inline errors and makes no fetch call", async () => {
    const user = userEvent.setup();
    const f = mockApi();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 3: edge-case test/i }));

    expect(f).not.toHaveBeenCalled();
    expect(screen.getByText(/between 1 and 12/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hours outside/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/describe your day/i)).toHaveAttribute("aria-describedby", expect.stringContaining("err-routine"));
    expect(runButton()).toBeDisabled();

    // Export tab shows a PASS row for the blocked run
    await user.click(screen.getByRole("tab", { name: /readme testing row/i }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/\| Preset 3: Edge-Case Test \|.*\| PASS \|/)).toBeInTheDocument();
  });

  it("disables presets and the run button while a run is in progress (R3.5)", async () => {
    const user = userEvent.setup();
    let resolve!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolve = r))));
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 2: asthma care/i }));
    for (const name of [/preset 1/i, /preset 2/i, /preset 3/i]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: /analysing/i })).toBeDisabled();
    resolve(new Response(JSON.stringify(smogResponse())));
    await screen.findByText("178");
    expect(screen.getByRole("button", { name: /preset 1/i })).toBeEnabled();
  });
});

describe("form interaction", () => {
  it("enables the run button once the form is valid and submits it", async () => {
    const user = userEvent.setup();
    const f = mockApi();
    render(<Home />);
    await user.type(screen.getByLabelText(/describe your day/i), "Walk to school at 7 AM");
    expect(runButton()).toBeEnabled();
    await user.click(runButton());
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("example chips append to the routine", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "+ Evening jog at 6 PM" }));
    expect(screen.getByLabelText(/describe your day/i)).toHaveValue("Evening jog at 6 PM");
  });

  it("stepper buttons clamp hours to 1–12", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    const plus = screen.getByRole("button", { name: /increase hours/i });
    for (let i = 0; i < 12; i++) await user.click(plus);
    expect(screen.getByLabelText(/hours outside/i)).toHaveValue(12);
  });

  it("zone and mode radiogroups work with arrow keys", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    const johar = screen.getByRole("radio", { name: "Johar Town" });
    johar.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Gulberg" })).toBeChecked();

    screen.getByRole("radio", { name: /motorbike/i }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /walk \/ run/i })).toBeChecked();
  });

  it("the 'more areas' select picks an extended zone", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    await user.selectOptions(screen.getByLabelText(/more lahore areas/i), "model_town");
    expect(screen.getByRole("radio", { name: "Johar Town" })).not.toBeChecked();
    expect(screen.getByText(/selected: model town/i)).toBeInTheDocument();
  });
});

describe("degraded states", () => {
  it("shows the AI error and a Retry AI button while keeping metrics (R9.4)", async () => {
    const user = userEvent.setup();
    const f = mockApi(smogResponse({ ai: null, aiError: "AI_TIMEOUT", meta: { ...smogResponse().meta, latencyMs: null } }));
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 1/i }));
    expect(await screen.findByText("178")).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel"); // only the visible one
    expect(within(panel).getByText(/AI insights unavailable \(AI_TIMEOUT\)/)).toBeInTheDocument();
    expect(screen.getByTestId("compliance-badge")).toHaveTextContent("LATENCY: —");
    await user.click(within(panel).getByRole("button", { name: /retry ai/i }));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("shows OFFLINE SAMPLE when the server used the fallback (R9.2)", async () => {
    const user = userEvent.setup();
    mockApi(smogResponse({ meta: { ...smogResponse().meta, dataSource: "offline_sample" } }));
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 1/i }));
    expect(await screen.findByText("OFFLINE SAMPLE")).toBeInTheDocument();
  });

  it("shows a banner with Retry on network failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 1/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach/i);
    expect(screen.getByRole("button", { name: /^retry$/i })).toBeInTheDocument();
  });
});

describe("tabs and copy (R7.7, R7.8)", () => {
  it("tabs are reachable with arrow keys", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /preset 1/i }));
    const first = await screen.findByRole("tab", { name: /ai schedule optimizer/i });
    expect(first).toHaveAttribute("aria-selected", "true");
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /whatsapp family alert/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /whatsapp family alert/i })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /readme testing row/i })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(first).toHaveAttribute("aria-selected", "true");
  });

  it("CopyButton writes the exact text and shows Copied for 2 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CopyButton text={"*Alert*\nline 2"} label="Copy alert" />);
    await user.click(screen.getByRole("button", { name: /copy alert/i }));
    expect(writeText).toHaveBeenCalledWith("*Alert*\nline 2");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    vi.advanceTimersByTime(2100);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));
    vi.useRealTimers();
  });
});

describe("theme toggle", () => {
  it("switches html.dark and persists the choice", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("smogshield-theme")).toBe("light");
    await user.click(await screen.findByRole("button", { name: /switch to dark theme/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("smogshield-theme")).toBe("dark");
  });
});
