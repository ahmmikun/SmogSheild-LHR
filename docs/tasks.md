# Implementation Plan

This is a test-first, incremental build plan for [requirements.md](requirements.md) and [design.md](design.md). Each task leaves the app building and the tests passing. Time boxes add up to **150 min** (the 2.5 h build window).

Conventions:

- Work through the tasks in order and tick each box when it's done.
- Run `npx vitest run` after each task.
- Install every dependency with `--save-exact`.

- [ ] 1. Scaffold the project, environment, and test harness (15 min)
  - Run `npx create-next-app@latest smogshield-tmp --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"`. `create-next-app` refuses to run in a non-empty folder, and this repo root already has README, CONTRIBUTING, SECURITY, and `.github/`.
  - Move the generated files into the repo root, except its `README.md` and `.gitignore`. Merge its `.gitignore` entries into the existing one, then delete `smogshield-tmp/`.
  - `npm install --save-exact framer-motion lucide-react zod clsx tailwind-merge`
  - `npm install --save-exact -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`
  - Add `vitest.config.ts` (environment `jsdom`, `@` alias, setup file importing `@testing-library/jest-dom/vitest`) and a `"test": "vitest run"` script.
  - Create `.env.example` containing `GROQ_API_KEY=` only.
  - Add `.env.*.local` and `coverage/` to `.gitignore`. Confirm `.env`, `.env.local`, `.next/`, and `node_modules/` are already listed.
  - Create `lib/config.ts`: `MODEL_ID = "llama-3.1-8b-instant"`, `PROVIDER = "Groq"`, `OPEN_METEO_TIMEOUT_MS = 5000`, `GROQ_TIMEOUT_MS = 10000`, `WHO_PM25_24H = 15`, `PM25_PER_CIGARETTE = 22`.
  - Verify: `npm run build` and `npm test` (with an empty placeholder test) both pass.
  - _Requirements: R1.3, R10.1, R10.2, R10.3_

- [ ] 2. Define domain constants and the calculation engine, tests first (15 min)
  - Write `tests/bands.test.ts` and `tests/calc.test.ts` first, using the boundary cases, worked examples, and correctness properties in design.md §Testing Strategy.
  - Implement `lib/zones.ts` (5 zones, 4 modes with multipliers and icon names) and `lib/presets.ts` (Presets 1–3 exactly as written in R3).
  - Implement `lib/bands.ts`: `aqiToBand()` and `BAND_TOKENS` (classes copied from design.md §Semantic AQI Band Tokens).
  - Implement `lib/calc.ts`: `meanPm25`, `cigarettes`, `whoMultiple`, `safeWindows`, `peakSpikes`, `computeMetrics(telemetry, request)`, and `round1`.
  - Verify: all band boundary tests and the worked examples (1.9 / 0.8 / 1.5, WHO 11.0) pass.
  - _Requirements: R2.1, R2.2, R3.2, R3.3, R3.4, R5.1, R5.2, R5.3, R5.4, R5.5, R5.6_

- [ ] 3. Build the Open-Meteo client with offline fallback (15 min)
  - Capture one real response for `riphah_johar` with the design.md query, then save it as `lib/offlineSample.ts`.
  - Write `tests/openMeteo.test.ts` first, using a mocked `fetch`. Cover:
    - the URL is built correctly for each zone
    - a valid response maps to `Telemetry`
    - a timeout falls back to offline
    - a non-200 response falls back to offline
    - fewer than 12 non-null `pm2_5` values, or fewer than 3 daytime values, falls back to offline
  - Implement `fetchTelemetry(zone): Promise<{ telemetry; dataSource }>` using `AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS)` and `cache: "no-store"`.
  - _Requirements: R4.1, R4.2, R4.3, R4.4, R4.5, R9.1_

- [ ] 4. Build the Groq client, schemas, and post-processing (20 min)
  - Write `tests/schemas.test.ts` and `tests/groq.test.ts` first. Cover:
    - the payload `model` is `llama-3.1-8b-instant`, with `temperature` 0.1, `max_tokens` 1200, and `response_format.type` `json_object`
    - `**` becomes `*`
    - any model-supplied `riskStatus` or `reductionPercent` is stripped
    - `reductionPercent` is recomputed (08→14 with 188→62 gives 67)
    - items with an out-of-range `optimizedSlot` are dropped
    - each `AiErrorCode` path is reached
    - `latencyMs` is an integer
  - Implement `lib/schemas.ts` (`SmogRequestSchema`, `AiInsightSchema`) exactly as in design.md.
  - Implement `lib/groq.ts`: `buildPromptInput()`, `SYSTEM_PROMPT` (the 8 rules in design.md §System Prompt Outline), and `fetchInsight(metrics, request): Promise<{ ai; aiError?; latencyMs }>` with `performance.now()` timing around the `fetch` and `AbortSignal.timeout(GROQ_TIMEOUT_MS)`.
  - Read `process.env.GROQ_API_KEY` only inside `fetchInsight`. If it's missing, return `AI_NOT_CONFIGURED` with `latencyMs: null`.
  - _Requirements: R1.1, R1.2, R6.1, R6.2, R6.3, R6.4, R6.5, R6.6, R6.7, R6.8, R9.3, R9.5_

- [ ] 5. Build the `/api/smog` route handler (10 min)
  - Write `tests/route.test.ts` first. Cover:
    - an invalid body gives 400 `INVALID_REQUEST` with `fieldErrors` and makes zero `fetch` calls
    - the happy path returns the full `SmogResponse` shape
    - a Groq failure still returns 200 with `metrics` and `ai: null`
    - an Open-Meteo failure gives `dataSource: "offline_sample"`
  - Implement `app/api/smog/route.ts` with `runtime = "nodejs"` and `dynamic = "force-dynamic"`. It should parse, validate, call `fetchTelemetry`, `computeMetrics`, and `fetchInsight`, then assemble `meta` with `model: MODEL_ID` and `generatedAt`.
  - Test by hand: `curl -X POST localhost:3000/api/smog -H "Content-Type: application/json" -d "{...Preset 1...}"`.
  - _Requirements: R1.3, R4.3, R9.3, R9.6, R10.5_

- [ ] 6. Build the layout shell, design tokens, and header (10 min)
  - In `app/layout.tsx`, load Inter and JetBrains Mono via `next/font/google`, add `bg-[#090D16] text-slate-100`, and set metadata.
  - In `app/globals.css`, add base styles and a `@media (prefers-reduced-motion: reduce)` rule that disables `animate-pulse`.
  - Build the `components/ui/` primitives (Card, Badge, Button, Input, Textarea, Tabs) using the design.md tokens and focus ring. Add `lib/utils.ts` `cn()`.
  - Build `Header.tsx`: the brand, the pulsing dot, and the compliance badge. The badge shows `LATENCY: —` when `latencyMs` is null or undefined.
  - _Requirements: R1.4, R7.1, R7.2, R7.3, R11.2, R11.3, R11.6_

- [ ] 7. Build the control panel and preset ribbon (20 min)
  - Write the `tests/ui.test.tsx` cases first:
    - Preset 1 fills the fields and calls `fetch` once.
    - Preset 3 shows both inline errors and makes no `fetch` call.
    - The run button is disabled while the form is invalid and while a run is in progress.
    - Zone and mode radiogroups work with arrow keys.
  - Build `ControlPanel.tsx`:
    - zone pills
    - mode cards (`Bike`, `Footprints`, `Car`, `ShieldAlert`, each with its multiplier)
    - the `hoursOutside` input
    - the routine textarea with a character counter
    - client-side validation with `SmogRequestSchema.safeParse` and errors linked via `aria-describedby`
  - Build `PresetRibbon.tsx` with neo-brutalist buttons. Presets 1 and 2 fill the form and submit it. Preset 3 fills the form, runs validation, and records a blocked-run result for the exporter.
  - In `app/page.tsx`, add the form, status, and result state, a `runAnalysis()` that calls `fetch("/api/smog")`, and the defaults from R2.6.
  - _Requirements: R2.3, R2.4, R2.5, R2.6, R3.1, R3.2, R3.3, R3.4, R3.5, R11.3_

- [ ] 8. Build the hero cards and histogram (20 min)
  - Build `HeroCards.tsx`:
    - AQI card: AQI, band chip with label, PM2.5, `WHO ×n`, PM10/CO/NO₂, and an `OFFLINE SAMPLE` badge with the `WifiOff` icon when `dataSource` is offline.
    - Cigarette card: the value plus a gauge.
    - Safe Window card: the 3 safe hours with the lowest highlighted, and the peak spikes in a muted line.
  - Build `Histogram.tsx`:
    - 24 bars coloured by `BAND_TOKENS`, at 60% opacity rising to 100% on hover or focus
    - a tooltip and `aria-label` on each bar
    - a marker on Safe Window bars
    - dashed outlines for null hours
  - Add the `framer-motion` animation: container stagger of `0.06 s`, and bars growing with `scaleY` from `origin-bottom` (`easeOut`, 0.5 s). When `useReducedMotion()` is true, set `initial={false}`.
  - Wrap the telemetry display in `aria-live="polite"`, and add the empty, loading, and error states from design.md §UI States.
  - _Requirements: R7.4, R7.5, R7.6, R9.2, R11.4, R11.5, R11.6_

- [ ] 9. Build the insight tabs, copy actions, and README row exporter (15 min)
  - Write `tests/exportRow.test.ts` first. Cover: 6 cells in order, `|` escaped to `\|`, newlines removed, the PASS/FAIL rules (R8.4), and the header and separator rows.
  - Implement `lib/exportRow.ts`: `buildTestingRow(scenario, request | blockedInput, response | validationErrors)`.
  - Build `InsightTabs.tsx` using WAI-ARIA tabs:
    - Schedule table with `−n%` chips
    - WhatsApp `<pre>` with a `CopyButton`
    - Export `<pre>` with a `CopyButton`
    - While `ai` is null, every tab shows the `aiError` text and a `Retry AI` button, but the export tab still shows its row.
  - Build `CopyButton.tsx`: calls `navigator.clipboard.writeText`, then shows "Copied" with `role="status"` for 2 s.
  - Add UI tests for the copy button and for tab keyboard navigation.
  - _Requirements: R7.7, R7.8, R8.1, R8.2, R8.3, R8.4, R8.5, R9.4, R11.3_

- [ ] 10. Write the README, run the compliance audit, and rehearse the demo (10 min)
  - With a real `GROQ_API_KEY` in `.env.local`, run `npm run dev`. Click Presets 1, 2, and 3, then paste the 3 exported rows into the README Testing & Findings table. Preset 3 is the Known Limitations row.
  - Update `README.md`:
    - the 5 sections required by the hackathon manual, using its section titles word for word
    - the design.md architecture Mermaid diagram
    - setup steps (`cp .env.example .env.local`, `npm install`, `npm run dev`)
    - a "Not medical advice" note and the known limitations
  - Compliance audit:
    - `git grep -niE "openai|anthropic|gemini|70b" -- . ":!docs"` should match only the Groq endpoint path `api.groq.com/openai/v1`.
    - `git grep -n "GROQ_API_KEY"` should appear only in `lib/groq.ts`, `.env.example`, README, and tests.
    - After `npm run build`, confirm the key value isn't present anywhere in `.next/static`.
    - `git status` should show no `.env*` file other than `.env.example`.
  - Final check: `npm run build` and `npm test` both pass. Run the presets on the projector resolution (1920 × 1080) to confirm there's no page scroll and the badge shows the measured latency.
  - _Requirements: R1.1, R1.2, R10.1, R10.2, R10.4, R10.5, R11.1, R11.7_

## Requirement Coverage

| Requirement | Tasks |
|-------------|-------|
| R1 8B Model Compliance | 1, 4, 5, 6, 10 |
| R2 Zone & Exposure Profile | 2, 7 |
| R3 Demo Presets | 2, 7 |
| R4 Telemetry | 3, 5 |
| R5 Calculation Engine | 2 |
| R6 AI Layer | 4 |
| R7 Dashboard UI | 6, 8, 9 |
| R8 README Exporter | 9 |
| R9 Error Handling | 3, 4, 5, 8, 9 |
| R10 Security & Deliverables | 1, 5, 10 |
| R11 Non-Functional | 6, 7, 8, 9, 10 |
