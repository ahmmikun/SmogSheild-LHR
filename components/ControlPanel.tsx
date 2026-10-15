"use client";

import { Bike, Car, Footprints, Loader2, LocateFixed, MapPin, Minus, Plus, ShieldAlert, Sparkles, X } from "lucide-react";
import { HOURS_MAX, HOURS_MIN, ROUTINE_MAX } from "@/lib/schemas";
import { CORE_ZONE_IDS, MODES, ZONE_REGIONS, ZONES } from "@/lib/zones";
import type { ExposureMode, Mode, ZoneId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import type { GeoState } from "./useGeolocation";

export interface FormState {
  zone: ZoneId;
  mode: ExposureMode;
  /** Kept as a string so the user can type freely; validated on change. */
  hoursOutside: string;
  userRoutine: string;
}

const MODE_ICONS: Record<Mode["icon"], typeof Bike> = { Bike, Footprints, Car, ShieldAlert };

const ROUTINE_EXAMPLES = [
  "Bike to university at 8 AM",
  "Walk to the market at 5 PM",
  "School drop-off by car at 7 AM",
  "Evening jog at 6 PM",
];

function Step({ n, label, htmlFor, id }: { n: number; label: string; htmlFor?: string; id?: string }) {
  const content = (
    <>
      <span className="grid size-5 place-items-center rounded-full bg-blue-600 font-mono text-[11px] font-bold text-white">{n}</span>
      {label}
    </>
  );
  const cls = "mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200";
  return htmlFor ? (
    <label htmlFor={htmlFor} id={id} className={cls}>
      {content}
    </label>
  ) : (
    <p id={id} className={cls}>
      {content}
    </p>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
      {messages[0]}
    </p>
  );
}

export function ControlPanel({
  form,
  onChange,
  errors,
  isValid,
  running,
  geo,
  onLocate,
  onGpsOff,
  onSubmit,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>, touched?: keyof FormState) => void;
  /** Only the errors that should be visible right now (touched fields). */
  errors: Record<string, string[]>;
  isValid: boolean;
  running: boolean;
  geo: GeoState;
  onLocate: () => void;
  onGpsOff: () => void;
  onSubmit: () => void;
}) {
  const hoursNum = Number(form.hoursOutside);
  const routineLen = form.userRoutine.trim().length;
  const extendedSelected = form.zone !== "custom_gps" && !(CORE_ZONE_IDS as readonly string[]).includes(form.zone);

  const bumpHours = (d: number) => {
    const base = Number.isFinite(hoursNum) && form.hoursOutside !== "" ? hoursNum : 0;
    const next = Math.min(HOURS_MAX, Math.max(HOURS_MIN, Math.round(base) + d));
    onChange({ hoursOutside: String(next) }, "hoursOutside");
  };

  const addExample = (text: string) => {
    const cur = form.userRoutine.trim();
    const joined = cur ? `${cur.replace(/[,.]$/, "")}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
    onChange({ userRoutine: joined.slice(0, ROUTINE_MAX) }, "userRoutine");
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Your exposure profile</h2>
        <span className="text-xs text-slate-600 dark:text-slate-400">4 quick steps</span>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid && !running) onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        {/* 1. Zone */}
        <fieldset aria-describedby={errors.zone ? "err-zone" : undefined}>
          <legend className="sr-only">Where are you in Lahore?</legend>
          <Step n={1} label="Where are you in Lahore?" id="zone-label" />
          <div role="radiogroup" aria-labelledby="zone-label" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {CORE_ZONE_IDS.map((id) => {
              const z = ZONES[id];
              const checked = form.zone === id;
              return (
                <label
                  key={id}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500",
                    checked
                      ? "border-blue-600 bg-blue-600/10 text-blue-800 shadow-[0_0_12px] shadow-blue-500/20 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-200"
                      : "border-slate-300 bg-white text-slate-800 hover:border-blue-500/60 dark:border-blue-500/20 dark:bg-slate-900 dark:text-slate-200",
                  )}
                >
                  <input
                    type="radio"
                    name="zone"
                    value={id}
                    checked={checked}
                    disabled={running}
                    onChange={() => {
                      onGpsOff();
                      onChange({ zone: id }, "zone");
                    }}
                    className="sr-only"
                  />
                  {z.label.split(" / ")[0]}
                </label>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor="zone-more" className="sr-only">
              More Lahore areas
            </label>
            <select
              id="zone-more"
              value={extendedSelected ? form.zone : ""}
              disabled={running}
              onChange={(e) => {
                if (!e.target.value) return;
                onGpsOff();
                onChange({ zone: e.target.value as ZoneId }, "zone");
              }}
              className={cn(
                "focus-ring min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-1.5 text-sm dark:bg-slate-900",
                extendedSelected ? "border-blue-600 dark:border-blue-500" : "border-slate-300 dark:border-blue-500/20",
              )}
            >
              <option value="">More areas ({Object.keys(ZONES).length - CORE_ZONE_IDS.length})…</option>
              {ZONE_REGIONS.map((region) => (
                <optgroup key={region} label={region}>
                  {Object.values(ZONES)
                    .filter((z) => z.region === region && !z.core)
                    .map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {geo.status === "on" ? (
              <Button
                onClick={() => {
                  onGpsOff();
                  onChange({ zone: "riphah_johar" }, "zone");
                }}
                disabled={running}
                aria-label="Turn off live location"
                className="border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/50 dark:text-emerald-300"
              >
                <LocateFixed className="size-4" aria-hidden /> Live location ON <X className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <Button onClick={onLocate} disabled={running || geo.status === "locating"}>
                {geo.status === "locating" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MapPin className="size-4" aria-hidden />
                )}
                {geo.status === "locating" ? "Locating…" : "Use my location"}
              </Button>
            )}
          </div>
          <p className="mt-1 min-h-5 text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
            {geo.status === "on" && `Using your GPS position near ${geo.nearLabel} (rounded to ~100 m).`}
            {geo.status === "error" && <span className="text-red-700 dark:text-red-400">{geo.message}</span>}
            {geo.status !== "on" && geo.status !== "error" && form.zone !== "custom_gps" &&
              `Selected: ${ZONES[form.zone as keyof typeof ZONES]?.label ?? ""}`}
          </p>
          <FieldError id="err-zone" messages={errors.zone} />
        </fieldset>

        {/* 2. Mode */}
        <fieldset>
          <legend className="sr-only">How do you travel?</legend>
          <Step n={2} label="How do you travel?" id="mode-label" />
          <div role="radiogroup" aria-labelledby="mode-label" className="grid grid-cols-2 gap-2">
            {Object.values(MODES).map((m) => {
              const Icon = MODE_ICONS[m.icon];
              const checked = form.mode === m.id;
              return (
                <label
                  key={m.id}
                  title={m.label}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500",
                    checked
                      ? "border-blue-600 bg-blue-600/10 dark:border-blue-500 dark:bg-blue-500/20"
                      : "border-slate-300 bg-white hover:border-blue-500/60 dark:border-blue-500/20 dark:bg-slate-900",
                  )}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={checked}
                    disabled={running}
                    onChange={() => onChange({ mode: m.id }, "mode")}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <Icon className={cn("size-5", checked ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400")} aria-hidden />
                    <span
                      className={cn(
                        "rounded px-1.5 font-mono text-xs font-bold tabular-nums",
                        checked ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      ×{m.multiplier.toFixed(1)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold leading-tight">{m.shortLabel}</span>
                  <span className="text-xs leading-tight text-slate-600 dark:text-slate-400">{m.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 3. Hours */}
        <div>
          <Step n={3} label="Hours outside per day" htmlFor="hours" />
          <div className="flex items-center gap-2">
            <Button aria-label="Decrease hours" onClick={() => bumpHours(-1)} disabled={running} className="size-9 p-0">
              <Minus className="size-4" aria-hidden />
            </Button>
            <input
              id="hours"
              type="number"
              inputMode="numeric"
              min={HOURS_MIN}
              max={HOURS_MAX}
              step={1}
              value={form.hoursOutside}
              disabled={running}
              onChange={(e) => onChange({ hoursOutside: e.target.value }, "hoursOutside")}
              aria-invalid={errors.hoursOutside ? true : undefined}
              aria-describedby={errors.hoursOutside ? "err-hours hours-hint" : "hours-hint"}
              className={cn(
                "focus-ring w-20 rounded-lg border bg-white px-2 py-1.5 text-center font-mono text-lg font-bold tabular-nums dark:bg-slate-900",
                errors.hoursOutside ? "border-red-600 dark:border-red-500" : "border-slate-300 dark:border-blue-500/20",
              )}
            />
            <Button aria-label="Increase hours" onClick={() => bumpHours(1)} disabled={running} className="size-9 p-0">
              <Plus className="size-4" aria-hidden />
            </Button>
            <span id="hours-hint" className="text-xs text-slate-600 dark:text-slate-400">
              {HOURS_MIN}–{HOURS_MAX} hours
            </span>
          </div>
          <FieldError id="err-hours" messages={errors.hoursOutside} />
        </div>

        {/* 4. Routine */}
        <div>
          <Step n={4} label="Describe your day" htmlFor="routine" />
          <textarea
            id="routine"
            rows={3}
            maxLength={ROUTINE_MAX + 50}
            value={form.userRoutine}
            disabled={running}
            placeholder="e.g. Bike to university at 8 AM, return at 2 PM, evening walk at 6 PM"
            onChange={(e) => onChange({ userRoutine: e.target.value }, "userRoutine")}
            aria-invalid={errors.userRoutine ? true : undefined}
            aria-describedby={errors.userRoutine ? "err-routine routine-count" : "routine-count"}
            className={cn(
              "focus-ring w-full resize-y rounded-lg border bg-white p-2.5 text-sm dark:bg-slate-900",
              errors.userRoutine ? "border-red-600 dark:border-red-500" : "border-slate-300 dark:border-blue-500/20",
            )}
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1" aria-label="Example activities">
              {ROUTINE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={running}
                  onClick={() => addExample(ex)}
                  className="focus-ring rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-xs text-slate-700 hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:text-blue-300"
                >
                  + {ex}
                </button>
              ))}
            </div>
            <span
              id="routine-count"
              className={cn("font-mono text-xs tabular-nums", routineLen > ROUTINE_MAX ? "text-red-700 dark:text-red-400" : "text-slate-600 dark:text-slate-400")}
            >
              {routineLen}/{ROUTINE_MAX}
            </span>
          </div>
          <FieldError id="err-routine" messages={errors.userRoutine} />
        </div>

        <Button type="submit" variant="primary" disabled={!isValid || running} className="py-3 text-base">
          {running ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
          {running ? "Analysing…" : "Run AI Smog Exposure Analysis"}
        </Button>
        {!isValid && !running && (
          <p className="-mt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            Fill in all four steps to enable the analysis.
          </p>
        )}
      </form>
    </Card>
  );
}
