import { MODEL_ID, PROVIDER } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";

/** Shows the model/provider that actually answered the last run (defaults before the first run). */
export function Header({
  latencyMs,
  model = MODEL_ID,
  provider = PROVIDER,
}: {
  latencyMs: number | null | undefined;
  model?: string;
  provider?: string;
}) {
  const latency = typeof latencyMs === "number" ? `${latencyMs}ms` : "—";
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3 dark:border-blue-500/20">
      <div className="flex items-center gap-3">
        <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px] shadow-emerald-400 motion-reduce:animate-none dark:bg-emerald-400" />
        <h1 className="text-xl font-bold tracking-tight">
          SmogShield-LHR
          <span className="ml-2 border-l border-slate-300 pl-2 text-sm font-medium text-slate-600 dark:border-blue-500/20 dark:text-slate-400">
            Lahore Air Command Center
          </span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p
          data-testid="compliance-badge"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums tracking-tight text-slate-700 dark:border-blue-500/20 dark:bg-slate-900 dark:text-slate-300"
        >
          MODEL: <strong className="text-blue-700 dark:text-blue-400">{model}</strong>
          {" | "}PROVIDER: <strong className="text-blue-700 dark:text-blue-400">{provider}</strong>
          {" | "}LATENCY: <strong className="text-blue-700 dark:text-blue-400">{latency}</strong>
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}
