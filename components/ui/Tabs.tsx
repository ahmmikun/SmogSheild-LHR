"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

/** WAI-ARIA Tabs with automatic activation: Left/Right/Home/End move and select. */
export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const select = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setActive(n);
    refs.current[n]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => select(active + 1),
      ArrowLeft: () => select(active - 1),
      Home: () => select(0),
      End: () => select(tabs.length - 1),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1 border-b border-slate-300 pb-2 dark:border-blue-500/20">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              i === active
                ? "bg-blue-600/10 text-blue-700 ring-1 ring-blue-600/40 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/40"
                : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          id={`${base}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={i !== active}
          tabIndex={0}
          className="focus-ring min-h-0 rounded-lg"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
