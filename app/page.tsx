"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ControlPanel, type FormState } from "@/components/ControlPanel";
import { Header } from "@/components/Header";
import { HeroCards } from "@/components/HeroCards";
import { Histogram } from "@/components/Histogram";
import { InsightTabs } from "@/components/InsightTabs";
import { PresetRibbon } from "@/components/PresetRibbon";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/States";
import { useGeolocation } from "@/components/useGeolocation";
import { buildTestingTable, type ExportCase } from "@/lib/exportRow";
import { SmogRequestSchema, toFieldErrors } from "@/lib/schemas";
import type { Preset, SmogRequest, SmogResponse, ZoneId } from "@/lib/types";
import { MODES, ZONES } from "@/lib/zones";

/** R2.6 defaults. */
const DEFAULT_FORM: FormState = { zone: "riphah_johar", mode: "bike", hoursOutside: "4", userRoutine: "" };

type Status = "idle" | "loading" | "success" | "error";
interface Scenario {
  name: string;
  expected: string;
}
const MANUAL: Scenario = { name: "Manual run", expected: "Metrics, safe windows and an 8B AI plan returned" };

function toRequestCandidate(form: FormState, coords?: { lat: number; lon: number }) {
  return {
    zone: form.zone,
    mode: form.mode,
    hoursOutside: form.hoursOutside.trim() === "" ? Number.NaN : Number(form.hoursOutside),
    userRoutine: form.userRoutine,
    ...(form.zone === "custom_gps" && coords ? { customCoords: coords } : {}),
  };
}

function validate(form: FormState, coords?: { lat: number; lon: number }) {
  const r = SmogRequestSchema.safeParse(toRequestCandidate(form, coords));
  return r.success
    ? { ok: true as const, request: r.data as SmogRequest, errors: {} as Record<string, string[]> }
    : { ok: false as const, request: null, errors: toFieldErrors(r.error) };
}

function describeInput(form: FormState, zoneLabel: string) {
  const mode = MODES[form.mode];
  const routine = form.userRoutine.trim() || "(empty routine)";
  return `${zoneLabel}; ${mode.shortLabel} ×${mode.multiplier}; ${form.hoursOutside || "?"} h; "${routine}"`;
}

const zoneLabelOf = (zone: ZoneId, near?: string) =>
  zone === "custom_gps" ? `Live location${near ? ` near ${near}` : ""}` : ZONES[zone].label;

export default function Home() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SmogResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [exportCase, setExportCase] = useState<ExportCase | null>(null);
  const lastRun = useRef<{ request: SmogRequest; scenario: Scenario; form: FormState } | null>(null);
  const [runMode, setRunMode] = useState<SmogRequest["mode"]>(DEFAULT_FORM.mode);
  // A successful GPS fix switches the zone to the live location.
  const onFix = useCallback(() => setForm((f) => ({ ...f, zone: "custom_gps" })), []);
  const { geo, locate, turnOff } = useGeolocation(onFix);

  const coords = geo.status === "on" ? geo.coords : undefined;
  const validation = useMemo(() => validate(form, coords), [form, coords]);
  const visibleErrors = useMemo(
    () => Object.fromEntries(Object.entries(validation.errors).filter(([k]) => touched.has(k as keyof FormState))),
    [validation.errors, touched],
  );
  const running = status === "loading";

  const onChange = useCallback((patch: Partial<FormState>, field?: keyof FormState) => {
    setForm((f) => ({ ...f, ...patch }));
    if (field) setTouched((t) => new Set(t).add(field));
  }, []);

  const onGpsOff = useCallback(() => {
    turnOff();
    setForm((f) => (f.zone === "custom_gps" ? { ...f, zone: "riphah_johar" } : f));
  }, [turnOff]);

  const runAnalysis = useCallback(async (request: SmogRequest, scenario: Scenario, formSnapshot: FormState) => {
    lastRun.current = { request, scenario, form: formSnapshot };
    setStatus("loading");
    setRequestError(null);
    const zoneLabel = zoneLabelOf(request.zone, geo.status === "on" ? geo.nearLabel : undefined);
    const base = { scenario: scenario.name, input: describeInput(formSnapshot, zoneLabel), expected: scenario.expected };
    try {
      const res = await fetch("/api/smog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.metrics) {
        const data = body as SmogResponse;
        setResult(data);
        setRunMode(request.mode);
        setStatus("success");
        setExportCase({ ...base, kind: "run", httpStatus: res.status, response: data, input: describeInput(formSnapshot, data.meta.zoneLabel) });
        return;
      }
      if (res.status === 400 && body?.fieldErrors) {
        setTouched(new Set(Object.keys(body.fieldErrors) as (keyof FormState)[]));
      }
      setExportCase({ ...base, kind: "run", httpStatus: res.status, response: null });
      setRequestError(res.status === 400 ? "The server rejected the input. Check the highlighted fields." : `Analysis failed (HTTP ${res.status}).`);
      setStatus("error");
    } catch {
      setRequestError("Couldn't reach the SmogShield server. Check your connection.");
      setStatus("error");
    }
  }, [geo]);

  const onSubmit = () => {
    if (validation.ok) runAnalysis(validation.request, MANUAL, form);
  };

  const onPreset = (p: Preset) => {
    turnOff();
    const next: FormState = { zone: p.zone, mode: p.mode, hoursOutside: String(p.hoursOutside), userRoutine: p.userRoutine };
    setForm(next);
    const scenario = { name: p.name, expected: p.expectedOutput };
    const v = validate(next);
    if (!v.ok) {
      // Preset 3: show inline errors, send nothing (R3.4).
      setTouched(new Set(["hoursOutside", "userRoutine"]));
      setExportCase({
        kind: "blocked",
        scenario: p.name,
        input: describeInput(next, ZONES[p.zone].label),
        expected: p.expectedOutput,
        fieldErrors: v.errors,
      });
      return;
    }
    setTouched(new Set());
    runAnalysis(v.request, scenario, next);
  };

  const retry = () => {
    const l = lastRun.current;
    if (l) runAnalysis(l.request, l.scenario, l.form);
  };

  const exportTable = exportCase ? buildTestingTable(exportCase) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6">
      <Header latencyMs={result?.meta.latencyMs} model={result?.meta.model} provider={result?.meta.provider} />
      <PresetRibbon onPreset={onPreset} disabled={running} />

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section aria-label="Exposure profile" className="lg:col-span-4">
          <ControlPanel
            form={form}
            onChange={onChange}
            errors={visibleErrors}
            isValid={validation.ok}
            running={running}
            geo={geo}
            onLocate={locate}
            onGpsOff={onGpsOff}
            onSubmit={onSubmit}
          />
        </section>

        <section aria-label="Results" aria-live="polite" className="flex flex-col gap-4 lg:col-span-8">
          {requestError && <ErrorBanner message={requestError} onRetry={retry} />}
          {running ? (
            <LoadingState />
          ) : result ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Results for <strong className="text-slate-900 dark:text-slate-100">{result.meta.zoneLabel}</strong> ·{" "}
                {MODES[runMode].shortLabel} · generated{" "}
                {new Date(result.meta.generatedAt).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })} PKT
              </p>
              <HeroCards data={result} />
              <Histogram metrics={result.metrics} />
            </>
          ) : (
            <EmptyState />
          )}
          {(result || exportCase) && !running && (
            <InsightTabs
              ai={result?.ai ?? null}
              aiError={result?.aiError}
              exportTable={exportTable}
              onRetry={retry}
              retrying={running}
              showAi={!!result}
            />
          )}
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-300 pt-3 text-center text-xs text-slate-600 dark:border-blue-500/20 dark:text-slate-400">
        <p>
          <strong>Not medical advice.</strong> SmogShield-LHR is a decision-support prototype for Hacktoberfest Lahore 2026 (Riphah International University).
          See a doctor if you have breathing symptoms.
        </p>
        <p className="mt-1">
          Runtime AI: <code className="font-mono">openai/gpt-oss-20b</code> via Groq, with optional <code className="font-mono">gemini-3.8-flash</code> fallback. Air data: Open-Meteo (CAMS).
        </p>
      </footer>
    </div>
  );
}
