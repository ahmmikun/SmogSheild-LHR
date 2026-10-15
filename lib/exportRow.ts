// README Testing Row exporter (R8).
import type { SmogResponse } from "./types";

export const EXPORT_HEADER =
  "| Test Scenario | Input | Expected Output | Actual Outcome | Pass/Fail | Known Limitations |";
export const EXPORT_SEPARATOR = "| :--- | :--- | :--- | :--- | :--- | :--- |";

/** Escapes `|` and flattens newlines so a value fits in one Markdown cell (R8.3). */
export function escapeCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

interface Common {
  scenario: string;
  /** Human-readable description of the inputs. */
  input: string;
  expected: string;
}

export type ExportCase =
  | (Common & { kind: "run"; httpStatus: number; response: SmogResponse | null })
  | (Common & { kind: "blocked"; fieldErrors: Record<string, string[]> });

export function passFail(c: ExportCase): "PASS" | "FAIL" {
  if (c.kind === "blocked") return "PASS"; // R8.4: Preset 3 passes if validation blocked it
  return c.httpStatus === 200 && c.response?.ai ? "PASS" : "FAIL";
}

function actual(c: ExportCase): string {
  if (c.kind === "blocked") {
    const fields = Object.keys(c.fieldErrors).join(", ") || "form";
    return `Submission blocked client-side; inline errors on ${fields}; 0 requests sent to /api/smog`;
  }
  if (!c.response) return `HTTP ${c.httpStatus}; no analysis returned`;
  const { metrics: m, ai, aiError, meta } = c.response;
  const safe = m.safeWindows.map((s) => `${String(s.hour).padStart(2, "0")}:00`).join("/");
  const head = `AQI ${m.usAqi} (${m.riskStatus}), WHO ×${m.whoMultiple}, ${m.cigarettes} cigarettes, safe ${safe}`;
  const aiPart = ai
    ? `8B AI plan with ${ai.rescheduledPlan.length} item(s) + Roman Urdu alert in ${meta.latencyMs ?? "—"} ms`
    : `AI unavailable (${aiError ?? "unknown"})`;
  return `${head}; ${aiPart}; data ${meta.dataSource}`;
}

function limitation(c: ExportCase): string {
  if (c.kind === "blocked") return "Hours capped at 1–12 and routine at 3–500 characters";
  if (c.response?.meta.dataSource === "offline_sample") return "Open-Meteo unreachable: bundled offline sample used";
  return "CAMS ~45 km grid; schedule limited to 06:00–21:00 PKT";
}

export function buildTestingRow(c: ExportCase): string {
  const cells = [c.scenario, c.input, c.expected, actual(c), passFail(c), limitation(c)].map(escapeCell);
  return `| ${cells.join(" | ")} |`;
}

export function buildTestingTable(c: ExportCase): string {
  return [EXPORT_HEADER, EXPORT_SEPARATOR, buildTestingRow(c)].join("\n");
}
