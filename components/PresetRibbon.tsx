"use client";

import { PRESETS } from "@/lib/presets";
import type { Preset } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PresetRibbon({ onPreset, disabled }: { onPreset: (p: Preset) => void; disabled: boolean }) {
  return (
    <section
      aria-label="Judge demo presets"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-white/70 px-4 py-3 dark:border-blue-500/15 dark:bg-slate-900/50"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        One-click demos:
      </span>
      {PRESETS.map((p) => {
        const edge = p.expectBlocked;
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPreset(p)}
            title={p.description}
            className={cn(
              "focus-ring group inline-flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 transition-transform",
              "dark:bg-slate-900 dark:text-slate-100",
              "hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0",
              edge
                ? "border-amber-500 shadow-[4px_4px_0_0_rgba(245,158,11,0.6)] hover:shadow-[2px_2px_0_0_rgba(245,158,11,0.6)]"
                : "border-blue-500 shadow-[4px_4px_0_0_rgba(59,130,246,0.6)] hover:shadow-[2px_2px_0_0_rgba(59,130,246,0.6)]",
            )}
          >
            <span>{p.name}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[11px] font-bold",
                edge ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-blue-500/15 text-blue-800 dark:text-blue-300",
              )}
            >
              {p.tag}
            </span>
          </button>
        );
      })}
    </section>
  );
}
