"use client";

import { AlertTriangle, CalendarClock, FileText, MessageCircle, RefreshCw } from "lucide-react";
import { hourTo12h, slotToHour } from "@/lib/calc";
import type { AiErrorCode, AiInsight } from "@/lib/types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Tabs } from "./ui/Tabs";
import { CopyButton } from "./CopyButton";

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: "AI is not configured on this server (no Groq API key). The numbers above are still accurate.",
  AI_TIMEOUT: "The 8B model took longer than 10 seconds to answer.",
  AI_UPSTREAM_ERROR: "The Groq service returned an error (rate limit or outage).",
  AI_INVALID_JSON: "The model replied, but not in valid JSON.",
  AI_SCHEMA_MISMATCH: "The model's reply didn't match the expected format.",
};

function AiUnavailable({ code, onRetry, retrying }: { code?: AiErrorCode; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="size-4" aria-hidden /> AI insights unavailable{code ? ` (${code})` : ""}
      </p>
      <p className="text-slate-700 dark:text-slate-300">{code ? AI_ERROR_MESSAGES[code] : "No AI response."}</p>
      <Button onClick={onRetry} disabled={retrying}>
        <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} aria-hidden /> Retry AI
      </Button>
    </div>
  );
}

const slotLabel = (slot: string) => `${slot} (${hourTo12h(slotToHour(slot))})`;

function ScheduleTab({ ai }: { ai: AiInsight }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="rounded-lg bg-slate-100 p-2.5 leading-relaxed dark:bg-slate-800/60">{ai.executiveSummary}</p>
      <table className="w-full text-left" aria-label="Rescheduled activities">
        <thead>
          <tr className="border-b border-slate-300 text-xs uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-400">
            <th className="py-1.5 pr-2 font-semibold">Instead of</th>
            <th className="py-1.5 pr-2 font-semibold">Go at</th>
            <th className="py-1.5 pr-2 font-semibold">Less PM2.5</th>
            <th className="py-1.5 font-semibold">Why</th>
          </tr>
        </thead>
        <tbody>
          {ai.rescheduledPlan.map((p, i) => (
            <tr key={i} className="border-b border-slate-200 align-top dark:border-slate-800">
              <td className="py-2 pr-2 font-mono tabular-nums text-slate-600 line-through decoration-red-500/60 dark:text-slate-400">
                {slotLabel(p.originalSlot)}
              </td>
              <td className="py-2 pr-2 font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{slotLabel(p.optimizedSlot)}</td>
              <td className="py-2 pr-2">
                {p.reductionPercent > 0 ? (
                  <span className="rounded border border-emerald-600/40 bg-emerald-500/10 px-1.5 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    −{p.reductionPercent}%
                  </span>
                ) : (
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{p.reductionPercent === 0 ? "0%" : `+${-p.reductionPercent}%`}</span>
                )}
              </td>
              <td className="py-2 text-slate-700 dark:text-slate-300">{p.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-l-2 border-blue-500 pl-3 text-slate-700 dark:text-slate-300">
        <strong>At home: </strong>
        {ai.homeVentilationAdvice}
      </p>
    </div>
  );
}

function WhatsAppTab({ alert }: { alert: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-slate-600 dark:text-slate-400">
        Roman Urdu alert for family. Single <code className="font-mono">*asterisks*</code> become bold in WhatsApp.
      </p>
      <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm dark:border-blue-500/20 dark:bg-slate-950">
        {alert}
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={alert} label="Copy alert" />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(alert)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
        >
          <MessageCircle className="size-3.5" aria-hidden /> Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

function ExportTab({ table }: { table: string | null }) {
  if (!table) return <p className="text-sm text-slate-600 dark:text-slate-400">Run an analysis or a preset to generate a row.</p>;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-slate-600 dark:text-slate-400">Paste into the README &ldquo;Testing &amp; Findings&rdquo; table.</p>
      <pre className="max-h-44 overflow-auto whitespace-pre rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs dark:border-blue-500/20 dark:bg-slate-950">
        {table}
      </pre>
      <CopyButton text={table} label="Copy Markdown row" />
    </div>
  );
}

export function InsightTabs({
  ai,
  aiError,
  exportTable,
  onRetry,
  retrying,
  showAi,
}: {
  ai: AiInsight | null;
  aiError?: AiErrorCode;
  exportTable: string | null;
  onRetry: () => void;
  retrying: boolean;
  /** false when only a blocked Preset 3 has happened (no run yet). */
  showAi: boolean;
}) {
  const unavailable = <AiUnavailable code={aiError} onRetry={onRetry} retrying={retrying} />;
  const noRun = <p className="text-sm text-slate-600 dark:text-slate-400">Run an analysis to see AI insights.</p>;
  const aiContent = (node: React.ReactNode) => (!showAi ? noRun : ai ? node : unavailable);

  return (
    <Card>
      <Tabs
        label="Analysis insights"
        tabs={[
          {
            id: "schedule",
            label: "AI Schedule Optimizer",
            icon: <CalendarClock className="size-4" aria-hidden />,
            content: aiContent(ai && <ScheduleTab ai={ai} />),
          },
          {
            id: "whatsapp",
            label: "WhatsApp Family Alert",
            icon: <MessageCircle className="size-4" aria-hidden />,
            content: aiContent(ai && <WhatsAppTab alert={ai.whatsappFamilyAlert} />),
          },
          {
            id: "export",
            label: "README Testing Row",
            icon: <FileText className="size-4" aria-hidden />,
            content: <ExportTab table={exportTable} />,
          },
        ]}
      />
    </Card>
  );
}
