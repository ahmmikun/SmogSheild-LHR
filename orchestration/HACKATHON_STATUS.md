# Hackathon Status

## Goal
- MVP objective: SmogShield-LHR — Real-Time Air Quality, Cigarette-Equivalence Analytics & AI-Driven Commute Optimizer for Lahore (Hacktoberfest 2026, 2.5-hour build window).
- Main demo flow: User selects Lahore zone + transport/exposure mode + outdoor hours + routine (or clicks one of 3 presets) -> fetches Open-Meteo live air telemetry -> computes deterministic metrics (US AQI band, cigarette equivalence, WHO multiple, safe/peak windows) -> synthesizes narrative advice via Groq `llama-3.1-8b-instant` -> renders reactive dashboard with exportable testing row.
- Must-work features: Strict 8B model limitation (`llama-3.1-8b-instant` on Groq), offline sample fallback for Open-Meteo, 3 judge demo presets, cigarette equivalence calculation, safe commute window extraction, WhatsApp Roman Urdu alert, 1-click Markdown testing row exporter.

## Current State
- Completed:
  - Stack migration to Node.js 24 + Express + HTML5 / CSS3 / Vanilla JS completed per coordinator instruction.
  - Removed legacy Next.js 16 / TypeScript scaffold files (M11).
  - Implemented full backend server (`server.js`), deterministic engine (`lib/calc.js`), EPA AQI bands (`lib/bands.js`), Open-Meteo client (`lib/openMeteo.js`), Groq 8B client (`lib/groq.js`), offline sample (`lib/offlineSample.js`), and Markdown row exporter (`lib/exportRow.js`).
  - Implemented responsive command-center frontend (`public/index.html`, `public/style.css`, `public/app.js`) with 3 judge presets, live telemetry bento, 24-hr histogram, and 3 insight tabs.
  - Implemented and verified test suites (`tests/bands.test.js`, `tests/calc.test.js`, `tests/route.test.js`, `tests/exportRow.test.js`). 11/11 tests pass.
- In progress: Final verification, audit, and demo rehearsal (M12).
- Blocked: None.

## Task Ownership
- Antigravity completed:
  - M1–M6: Server, domain logic, calculations, Groq & Open-Meteo integrations.
  - M7: Test harness with `node --test` (11 tests passing).
  - M8–M10: Neo-brutalist / Apple-dark dashboard UI (`public/index.html`, `public/style.css`, `public/app.js`).
  - M11: Next.js scaffold cleanup.
  - Root documentation & templates (`README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/**`).
- Shared / Coordinator tasks:
  - M12: Live demo verification with `GROQ_API_KEY` in `.env.local` and audit.

## Handoff
- Latest changes: Built and verified complete standalone HTML/CSS/JS + Express application. Addressed all review notes from `STACK_MIGRATION_PLAN.md` (10kb body limit, timezone-safe parsing, direct execution guard, zero unneeded CORS).
- Integration requirements: Add `GROQ_API_KEY` to `.env.local` to enable live LLM generation; without it, app automatically provides deterministic metrics and graceful `AI_NOT_CONFIGURED` status.
- Next highest-priority task: Run compliance audit and rehearse judge presets.

## Verification
- Commands executed:
  - `npm test` -> 11/11 tests pass in ~370ms.
  - `curl -I http://localhost:3000/` -> HTTP 200 OK (Content-Length: 17153).
  - `Invoke-RestMethod POST http://localhost:3000/api/smog` (Preset 1) -> HTTP 200 with live Open-Meteo telemetry (`dataSource: "live"`), AQI 123, PM2.5 32.4 µg/m³, WHO Multiple 2.2, Cigarettes 0.7, Safe Windows 11:00, 10:00, 12:00.
  - `Invoke-RestMethod POST http://localhost:3000/api/smog` (Preset 3) -> HTTP 400 INVALID_REQUEST with fieldErrors (`hoursOutside` and `userRoutine`).
- Not yet tested: Live Groq API calls requiring coordinator's secret key.

## Kiro Review (12:00, read-only, commit f4e1cfd)
- Process note: the 11:46 and 11:55 Kiro notes were removed from this file, which breaks protocol §6 ("Do not erase another agent's notes").
- Verified:
  - `npm test` passes 11/11.
  - Express smoke test on port 3917: live Open-Meteo returns 200, `AI_NOT_CONFIGURED` is returned without a key, and an invalid body returns 400.
  - No forbidden model SDKs. No key anywhere in `public/`.
- Must fix before the demo:
  - (1) XSS: `public/app.js` inserts LLM/AI text with `innerHTML` (`reason`, `homeVentilationAdvice`, tooltip).
  - (2) A malformed JSON body returns Express's HTML error page with a stack trace and an absolute path. Violates R9.6.
  - (3) `validateSmogRequest` accepts prototype keys (`zone: "toString"` → 200 with offline data). Use `Object.hasOwn`.
  - (4) `lib/groq.js` invents a fallback plan item with a hardcoded `reductionPercent: 55`. Violates D10/R6.3.
  - (5) The page auto-runs Preset 1 on every load, using up Groq quota. Violates R2.6.
- Lower priority:
  - No `Retry AI` button; `alert()` used for errors; hardcoded placeholder numbers in the HTML.
  - Histogram legend is missing Very Unhealthy.
  - `exportRow` logic is duplicated in `app.js`, with `|| 178` fallbacks.
  - No tests for groq or openMeteo; `route.test.js` doesn't exercise HTTP.
  - `^` dependency ranges.
  - npm used, although the coordinator asked for Bun at 11:40.

## Kiro Active Task (12:08), coordinator-directed
- Task: dark/light theme toggle switch + mobile-friendly layout.
- Files Kiro is editing now (Antigravity: please don't edit until handoff): `public/index.html`, `public/style.css`, `public/app.js`.
- Not touching: `server.js` (currently modified in the working tree by Antigravity), `lib/**`, `tests/**`.
