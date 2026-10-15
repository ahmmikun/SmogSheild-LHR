import { AlertTriangle, BrainCircuit, Calculator, CloudSun, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const STEPS = [
  { icon: CloudSun, title: "Live air data", text: "We fetch the hourly PM2.5 forecast for your area from Open-Meteo." },
  { icon: Calculator, title: "Exact maths", text: "AQI band, WHO multiple and cigarette equivalence are computed in code, not guessed by AI." },
  { icon: BrainCircuit, title: "8B AI plan", text: "Llama 3.1 8B moves your outdoor plans to cleaner hours and writes a family alert." },
];

export function EmptyState() {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-bold">Choose a preset or run an analysis</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Fill in the four steps on the left, or click a one-click demo above. Here&apos;s what happens:
        </p>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="mb-1 flex items-center gap-2 font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-blue-600 font-mono text-xs text-white">{i + 1}</span>
              <Icon className="size-4 text-blue-700 dark:text-blue-400" aria-hidden />
              {title}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{text}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Fetching live Lahore air data and asking the 8B model… usually under 8 seconds.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-600/50 bg-red-500/10 px-4 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-medium text-red-800 dark:text-red-300">
        <AlertTriangle className="size-4" aria-hidden /> {message}
      </p>
      <Button onClick={onRetry}>
        <RefreshCw className="size-4" aria-hidden /> Retry
      </Button>
    </div>
  );
}
