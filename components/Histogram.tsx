"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { aqiToBand, BAND_ORDER, BAND_TOKENS } from "@/lib/bands";
import { hourTo12h, hourToSlot, isDaytime } from "@/lib/calc";
import type { Metrics } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "./ui/Card";

export function Histogram({ metrics }: { metrics: Metrics }) {
  const reduce = useReducedMotion();
  const safe = new Set(metrics.safeWindows.map((s) => s.hour));
  const peaks = new Set(metrics.peakSpikes.map((s) => s.hour));
  const max = Math.max(1, ...metrics.hourly.map((h) => h.pm25 ?? 0));
  const [selected, setSelected] = useState<number>(metrics.safeWindows[0]?.hour ?? 12);
  const sel = metrics.hourly.find((h) => h.hour === selected);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>24-hour PM2.5 forecast (PKT)</CardTitle>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400" aria-label="Legend">
          {BAND_ORDER.map((b) => (
            <li key={b} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-sm", BAND_TOKENS[b].bar)} aria-hidden />
              {BAND_TOKENS[b].shortLabel}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden /> Safe hour
          </li>
        </ul>
      </div>

      <div
        role="group"
        aria-label="Hourly PM2.5 bars. Use Tab to move between hours."
        className="relative flex h-32 items-end gap-[3px] rounded-xl border border-slate-200 bg-slate-50 px-1 pt-3 dark:border-slate-800 dark:bg-slate-950/40"
      >
        {/* Daytime band shading 06–21 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 rounded-md bg-blue-500/5"
          style={{ left: `${(6 / 24) * 100}%`, width: `${(16 / 24) * 100}%` }}
        />
        {metrics.hourly.map((h, i) => {
          const band = h.usAqi !== null ? aqiToBand(h.usAqi) : null;
          const tok = band ? BAND_TOKENS[band] : null;
          const label =
            h.pm25 === null
              ? `${hourToSlot(h.hour)}, no data`
              : `${hourToSlot(h.hour)}, PM2.5 ${Math.round(h.pm25)} micrograms, ${tok?.label ?? "unknown"}${safe.has(h.hour) ? ", safe window" : ""}`;
          const heightPct = h.pm25 === null ? 0 : Math.max(4, (h.pm25 / max) * 100);
          const isSel = h.hour === selected;
          return (
            <button
              key={h.hour}
              type="button"
              aria-label={label}
              aria-pressed={isSel}
              onClick={() => setSelected(h.hour)}
              onMouseEnter={() => setSelected(h.hour)}
              onFocus={() => setSelected(h.hour)}
              className="focus-ring group relative flex h-full flex-1 flex-col items-center justify-end rounded-sm"
            >
              {safe.has(h.hour) && (
                <span aria-hidden className="absolute -top-2 size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-400" />
              )}
              {h.pm25 === null ? (
                <span aria-hidden className="h-2 w-full rounded-sm border border-dashed border-slate-400 dark:border-slate-600" />
              ) : (
                <motion.span
                  aria-hidden
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: reduce ? 0 : i * 0.02 }}
                  style={{ height: `${heightPct}%` }}
                  className={cn(
                    "w-full origin-bottom rounded-t-sm transition-opacity",
                    tok?.bar ?? "bg-slate-400",
                    isSel ? "opacity-100 ring-2 ring-slate-900 dark:ring-white" : "opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between px-1 font-mono text-xs text-slate-600 dark:text-slate-400" aria-hidden>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>

      {sel && (
        <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800/60" aria-live="polite">
          <strong className="font-mono">{hourToSlot(sel.hour)}</strong> ({hourTo12h(sel.hour)}) —{" "}
          {sel.pm25 === null ? (
            "no forecast for this hour"
          ) : (
            <>
              PM2.5 <strong className="font-mono">{Math.round(sel.pm25)} µg/m³</strong>
              {sel.usAqi !== null && (
                <>
                  , AQI <strong className="font-mono">{sel.usAqi}</strong> ({BAND_TOKENS[aqiToBand(sel.usAqi)].label})
                </>
              )}
              {sel.uvIndex !== null && `, UV ${sel.uvIndex}`}
              {safe.has(sel.hour) && <span className="ml-1 font-semibold text-emerald-700 dark:text-emerald-400">✓ safe window</span>}
              {peaks.has(sel.hour) && <span className="ml-1 font-semibold text-red-700 dark:text-red-400">⚠ peak — avoid</span>}
              {!isDaytime(sel.hour) && <span className="ml-1 text-slate-600 dark:text-slate-400">(outside 06–21 commute hours)</span>}
            </>
          )}
        </p>
      )}
    </Card>
  );
}
