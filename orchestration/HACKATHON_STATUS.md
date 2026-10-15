# Hackathon Status

## Goal
- MVP objective: SmogShield-LHR — Real-Time Air Quality, Cigarette-Equivalence Analytics & AI-Driven Commute Optimizer for Lahore (Hacktoberfest 2026, 2.5-hour build window).
- Main demo flow: User selects Lahore zone + transport/exposure mode + outdoor hours + routine (or clicks one of 3 presets) -> fetches Open-Meteo live air telemetry -> computes deterministic metrics (US AQI band, cigarette equivalence, WHO multiple, safe/peak windows) -> synthesizes narrative advice via Groq `llama-3.1-8b-instant` -> renders reactive dashboard with exportable testing row.
- Must-work features: Strict 8B model limitation (`llama-3.1-8b-instant` on Groq), offline sample fallback for Open-Meteo, 3 judge demo presets, cigarette equivalence calculation, safe commute window extraction, WhatsApp Roman Urdu alert, 1-click Markdown testing row exporter.

## Current State
- Completed: Root documentation fully transformed to SmogShield-LHR (`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `.github/` templates). Next.js application scaffold started by Kiro.
- In progress: Kiro CLI executing tasks 1–5 (backend, deterministic engine, Open-Meteo & Groq integrations, tests).
- Blocked: None. `/docs` strictly preserved. Antigravity ready for UI / frontend integration (Tasks 6–9) once scaffold and core handoff occurs.

## Task Ownership
- Kiro task: IN PROGRESS. `docs/tasks.md` tasks 1–5: scaffold, domain logic, Open-Meteo client, Groq client, `/api/smog` route. Task 10 (audit) comes later.
- Kiro-owned files:
  - `app/api/smog/route.ts`
  - `lib/config.ts`, `lib/types.ts`, `lib/zones.ts`, `lib/presets.ts`, `lib/bands.ts`, `lib/calc.ts`, `lib/schemas.ts`, `lib/openMeteo.ts`, `lib/offlineSample.ts`, `lib/groq.ts`, `lib/exportRow.ts`
  - `tests/{bands,calc,schemas,openMeteo,groq,route,exportRow}.test.ts`
  - Scaffold/config files: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.*`, `vitest.config.ts`, `vitest.setup.ts`, `postcss.config.*`, `eslint.config.*`, `.env.example`
- Antigravity task: Project root documentation complete. Standing by for frontend UI tasks (Tasks 6–9: layout shell, control panel, hero cards, 24-hr histogram, insight tabs) upon Kiro's handoff.
- Antigravity-owned files: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/**`, `orchestration/HACKATHON_STATUS.md`.
- Shared files requiring approval: `package.json`, `app/page.tsx`.

## Handoff
- Latest changes: Rewrote all root documents from generic MLH to project-specific SmogShield-LHR specifications. Kept `/docs` untouched.
- Integration requirements: Waiting for Kiro CLI to complete Task 1 (scaffold) and hand off UI entrypoints (`app/page.tsx`, `components/`).
- Next highest-priority task: UI Design & Frontend Components (Tasks 6–9) once backend scaffold is confirmed.

## Verification
- Commands executed: `git status --short`
- Results: All root markdown and GitHub templates updated with 8B compliance and SmogShield-LHR domain rules.
- Not yet tested: End-to-end UI tests pending frontend component construction.
