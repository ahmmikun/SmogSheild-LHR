"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CigaretteIcon, Clock, WifiOff } from "lucide-react";
import { BAND_ORDER, BAND_TOKENS } from "@/lib/bands";
import { hourTo12h, hourToSlot } from "@/lib/calc";
import type { SmogResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/Badge";
import { Card, CardTitle } from "./ui/Card";

const GAUGE_CAP = 10;

/** Horizontal 6-band AQI scale with a marker at the current value. */
function AqiScale({ aqi }: { aqi: number }) {
  const pct = Math.min(100, (Math.min(aqi, 500) / 500) * 100);
  // Band widths proportional to AQI ranges 0–50,51–100,101–150,151–200,201–300,301–500
  const widths = [10, 10, 10, 10, 20, 40];
  return (
    <div className="mt-2" aria-hidden>
      <div className="relative flex h-2 overflow-hidden rounded-full">
        {BAND_ORDER.map((b, i) => (
          <div key={b} className={BAND_TOKENS[b].bar} style={{ width: `${widths[i]}%` }} />
        ))}
      </div>
      <div className="relative h-3">
        <div
          className="absolute -top-0.5 size-0 -translate-x-1/2 border-x-[6px] border-b-[8px] border-x-transparent border-b-slate-900 dark:border-b-white"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function HeroCards({ data }: { data: SmogResponse }) {
  const reduce = useReducedMotion();
  const { metrics: m, meta } = data;
  const band = BAND_TOKENS[m.riskStatus];
  const gaugePct = Math.min(100, (m.cigarettes / GAUGE_CAP) * 100);
  const [best, ...rest] = m.safeWindows;

  const container = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } };
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
    >
      {/* AQI */}
      <motion.div variants={item}>
        <Card className="flex h-full flex-col" aria-label="Air quality index">
          <div className="flex items-start justify-between gap-2">
            <CardTitle>US Air Quality Index</CardTitle>
            <Badge className={band.chip}>{band.shortLabel}</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("font-mono text-5xl font-semibold tabular-nums tracking-tight", band.text)}>{m.usAqi}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{band.label}</span>
          </div>
          <AqiScale aqi={m.usAqi} />
          <p className="text-sm text-slate-700 dark:text-slate-300">{band.advice}</p>
          <p className="mt-2 text-sm">
            PM2.5 <strong className="font-mono tabular-nums">{m.pm25} µg/m³</strong>{" "}
            <span className="font-semibold text-orange-700 dark:text-orange-400" title="Current PM2.5 ÷ WHO 24-hour guideline (15 µg/m³)">
              = WHO ×{m.whoMultiple.toFixed(1)}
            </span>
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-2 font-mono text-xs tabular-nums text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span>PM10 {m.pm10}</span>
            <span>CO {m.co}</span>
            <span>NO₂ {m.no2}</span>
            {meta.dataSource === "offline_sample" && (
              <Badge className="border-red-600/40 bg-red-500/10 text-red-700 dark:text-red-300" title="Open-Meteo was unreachable; showing a bundled real Lahore reading">
                <WifiOff className="size-3" aria-hidden /> OFFLINE SAMPLE
              </Badge>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Cigarettes */}
      <motion.div variants={item}>
        <Card className="flex h-full flex-col" aria-label="Cigarette equivalence">
          <div className="flex items-start justify-between">
            <CardTitle>Cigarette Equivalence</CardTitle>
            <CigaretteIcon className="size-5 text-slate-500" aria-hidden />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-red-700 dark:text-red-400">
              {m.cigarettes.toFixed(1)}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">cigarettes / day</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Breathing today&apos;s air on your routine is like smoking about{" "}
            <strong>{m.cigarettes < 1 ? "less than one" : Math.round(m.cigarettes)}</strong> cigarette
            {m.cigarettes >= 1.5 ? "s" : ""}.
          </p>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="meter"
            aria-label="Cigarette gauge"
            aria-valuemin={0}
            aria-valuemax={GAUGE_CAP}
            aria-valuenow={Math.min(m.cigarettes, GAUGE_CAP)}
          >
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-red-500" style={{ width: `${gaugePct}%` }} />
          </div>
          <p className="mt-auto pt-2 font-mono text-xs text-slate-600 dark:text-slate-400">
            Berkeley Earth: 22 µg/m³ PM2.5 over 24 h ≈ 1 cigarette · mean {m.meanPm25} µg/m³
          </p>
        </Card>
      </motion.div>

      {/* Safe windows */}
      <motion.div variants={item}>
        <Card className="flex h-full flex-col" aria-label="Safe commute windows">
          <div className="flex items-start justify-between">
            <CardTitle>Safest Hours to Go Out</CardTitle>
            <Clock className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          {best && (
            <div className="mt-2 rounded-xl border border-emerald-600/50 bg-emerald-500/10 p-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Best window</p>
              <p className="font-mono text-4xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {hourToSlot(best.hour)}
                <span className="ml-2 text-base font-medium">({hourTo12h(best.hour)})</span>
              </p>
              <p className="font-mono text-xs tabular-nums text-emerald-800 dark:text-emerald-300">{best.pm25} µg/m³ PM2.5</p>
            </div>
          )}
          <ul className="mt-2 flex flex-col gap-1">
            {rest.map((s) => (
              <li key={s.hour} className="flex justify-between rounded-lg bg-emerald-500/5 px-2.5 py-1 text-sm">
                <span className="font-mono tabular-nums">
                  {hourToSlot(s.hour)} <span className="text-slate-600 dark:text-slate-400">({hourTo12h(s.hour)})</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">{s.pm25} µg/m³</span>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-2 text-xs text-red-700 dark:text-red-400">
            Avoid: {m.peakSpikes.map((p) => `${hourToSlot(p.hour)} (${Math.round(p.pm25)} µg)`).join(" · ")}
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
