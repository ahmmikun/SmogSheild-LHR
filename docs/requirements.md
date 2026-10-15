# Requirements Document

## Introduction

**SmogShield-LHR** is a single-page air-quality command center for Lahore. It turns live particulate data into exposure numbers people can act on (US AQI band, WHO safety multiple, cigarette equivalence, cleanest commute hours), then uses an 8B open-weight LLM to reschedule the user's daily routine and write a Roman Urdu WhatsApp alert for family members.

- **Event:** Hacktoberfest Lahore 2026, Riphah International University
- **Build window:** 2.5 hours
- **Hard constraints:** runtime AI is limited to `llama-3.1-8b-instant` on Groq. No authentication, no database, no multi-page routing.

Companion documents: [design.md](design.md) (architecture, contracts, UI system) and [tasks.md](tasks.md) (build checklist).

## Glossary

| Term | Definition |
|------|------------|
| **AQI Band** | One of the six US EPA AQI categories: `GOOD` (0–50), `MODERATE` (51–100), `USG` (101–150), `UNHEALTHY` (151–200), `VERY_UNHEALTHY` (201–300), `HAZARDOUS` (≥ 301). |
| **USG** | "Unhealthy for Sensitive Groups", the AQI band covering 101–150. |
| **PKT** | Pakistan Standard Time (`Asia/Karachi`, UTC+05:00). All hours in this spec are PKT. |
| **Zone** | One of five predefined Lahore locations with fixed coordinates (see R2). |
| **Exposure Mode** | The user's transport or vulnerability profile: `bike`, `walk`, `car`, or `elder_asthma`. |
| **Mode Multiplier** | A fixed coefficient per Exposure Mode that scales particulate intake (see R2). These are heuristic values, not clinical ones. |
| **Cigarette Equivalence** | Daily PM2.5 exposure expressed as cigarettes smoked, using the Berkeley Earth rule that 22 µg/m³ of PM2.5 over 24 h ≈ 1 cigarette. |
| **WHO Multiple** | Current PM2.5 divided by the WHO 2021 24-hour guideline of 15 µg/m³. |
| **Daytime Range** | Hours 06:00 through 21:00 PKT inclusive (16 hourly slots). |
| **Safe Window** | One of the 3 Daytime Range hours with the lowest forecast PM2.5. |
| **Peak Spike** | One of the 3 Daytime Range hours with the highest forecast PM2.5. |
| **Offline Sample** | A real Open-Meteo Lahore response bundled with the app and used only when the live API fails. It is always visibly labelled `OFFLINE SAMPLE`. |
| **Analysis Run** | One submission of the exposure profile to `POST /api/smog` and the response it produces. |

## Requirements

### Requirement 1: Strict 8B Open-Weight Model Compliance

**User Story:** As a hackathon judge, I want proof that the app uses only the approved 8B open-weight model, so that I can verify compliance with the event rules.

#### Acceptance Criteria

1. The system SHALL send every runtime LLM request to `https://api.groq.com/openai/v1/chat/completions` with `"model": "llama-3.1-8b-instant"`.
2. The system SHALL NOT import, install, or call any SDK or endpoint of OpenAI, Anthropic, Google Gemini, or any model with more than 8B parameters.
3. The system SHALL define the model identifier in a single server-side constant, and SHALL return that constant to the client as `meta.model` in every Analysis Run response.
4. WHEN an Analysis Run completes THEN the dashboard header SHALL show `MODEL: llama-3.1-8b-instant (8B) | PROVIDER: Groq`.

### Requirement 2: Zone and Exposure Profile Configuration

**User Story:** As a Lahore resident, I want to choose my area, my transport mode, and my daily routine, so that the analysis reflects my actual exposure.

#### Acceptance Criteria

1. The system SHALL offer exactly five zones with these IDs and coordinates:

   | ID | Label | Lat | Lon |
   |----|-------|-----|-----|
   | `riphah_johar` | Johar Town / Riphah Campus | 31.4697 | 74.2728 |
   | `gulberg` | Gulberg / Kalma Chowk | 31.5204 | 74.3587 |
   | `mall_road` | Mall Road / Civil Lines | 31.5580 | 74.3292 |
   | `dha` | DHA Phase 5 | 31.4720 | 74.4110 |
   | `shahdara` | Shahdara Industrial | 31.6215 | 74.2825 |

2. The system SHALL offer exactly four exposure modes with these multipliers:

   | ID | Label | Multiplier |
   |----|-------|-----------|
   | `bike` | Motorbike / Yango / Bykea rider (open-air intake) | 1.8 |
   | `walk` | Outdoor pedestrian / runner | 1.5 |
   | `car` | Sealed vehicle with cabin recirculation | 0.6 |
   | `elder_asthma` | Sensitive group (elderly / asthma) – vulnerability weight | 2.0 |

3. The system SHALL accept `hoursOutside` only as an integer from 1 to 12 inclusive.
4. The system SHALL accept `userRoutine` only as free text that is 3 to 500 characters long after trimming whitespace.
5. IF `hoursOutside` or `userRoutine` is outside its allowed range THEN the system SHALL show an inline error next to that field and SHALL disable the "Run AI Smog Exposure Analysis" button.
6. WHEN the page first loads THEN the system SHALL preselect zone `riphah_johar`, mode `bike`, and `hoursOutside` = 4, with an empty routine.

### Requirement 3: One-Click Judge Demo Presets

**User Story:** As a hackathon judge, I want one-click demo scenarios, so that I can evaluate the app without typing.

#### Acceptance Criteria

1. The system SHALL show three preset buttons in a ribbon above the main grid, labelled `Preset 1: Bike Commute`, `Preset 2: Asthma Care`, and `Preset 3: Edge-Case Test`.
2. WHEN the user clicks Preset 1 THEN the system SHALL set zone `riphah_johar`, mode `bike`, `hoursOutside` = 5, routine `"Depart on bike for university at 8 AM, return at 2 PM, evening walk on rooftop at 6 PM"`, and SHALL start an Analysis Run immediately.
3. WHEN the user clicks Preset 2 THEN the system SHALL set zone `mall_road`, mode `elder_asthma`, `hoursOutside` = 2, routine `"Morning walk in Lawrence Garden at 7 AM, afternoon visit to pharmacy at 4 PM"`, and SHALL start an Analysis Run immediately.
4. WHEN the user clicks Preset 3 THEN the system SHALL set `hoursOutside` = 15 and an empty routine, SHALL show inline errors for both fields, and SHALL NOT send any request to `/api/smog`.
5. WHILE an Analysis Run is in progress the system SHALL disable all three preset buttons and the primary action button.

### Requirement 4: Live Air-Quality Telemetry

**User Story:** As a user, I want current and hourly air-quality data for my zone, so that the advice is based on real conditions.

#### Acceptance Criteria

1. WHEN an Analysis Run starts THEN the server SHALL send a `GET` request to `https://air-quality-api.open-meteo.com/v1/air-quality` with the selected zone's `latitude` and `longitude`, `current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide`, `hourly=us_aqi,pm2_5,pm10,uv_index`, `timezone=Asia/Karachi`, and `forecast_days=1`.
2. The server SHALL abort the Open-Meteo request if no response arrives within 5000 ms.
3. The server SHALL call Open-Meteo directly. The browser SHALL NOT call Open-Meteo.
4. WHEN the Open-Meteo response is valid THEN the system SHALL set `meta.dataSource` to `"live"`.
5. The system SHALL treat the response as valid only if it contains all five `current` fields as numbers and 24 hourly entries, of which at least 12 have a non-null `pm2_5` value.

### Requirement 5: Deterministic Calculation Engine

**User Story:** As a user, I want exposure numbers that are reproducible, so that I can trust them more than an AI guess.

#### Acceptance Criteria

1. The system SHALL set `riskStatus` from the current `us_aqi` value using the six AQI Bands in the Glossary. The band boundaries are inclusive.
2. The system SHALL compute `cigarettes = (meanPm25 / 22) × (hoursOutside / 24) × modeMultiplier`, where `meanPm25` is the mean of the non-null hourly `pm2_5` values, rounded to 1 decimal place.
3. The system SHALL compute `whoMultiple = current pm2_5 / 15`, rounded to 1 decimal place.
4. The system SHALL return exactly 3 Safe Windows and exactly 3 Peak Spikes, all taken from the Daytime Range (06:00–21:00 PKT). Hours with null `pm2_5` SHALL be excluded, and ties SHALL go to the earlier hour.
5. WHEN the same telemetry and profile are submitted twice THEN the system SHALL return identical `metrics` both times.
6. The system SHALL compute all values in R5.1–R5.4 without calling the LLM.

### Requirement 6: 8B AI Intelligence Layer

**User Story:** As a user, I want a personalised rescheduled plan and a family alert, so that I can act on the data right away.

#### Acceptance Criteria

1. WHEN metrics are computed THEN the server SHALL send the metrics, a summary of the 24-hour PM2.5 values, the Safe Windows, the Peak Spikes, and `userRoutine` to the model in R1, with `temperature` 0.1, `max_tokens` 1200, and `response_format: { "type": "json_object" }`.
2. The server SHALL check the model output against a schema with the fields `executiveSummary` (string, 1–600 chars), `rescheduledPlan` (array of 1–5 items, each `{ originalSlot, optimizedSlot, reason }` with slots formatted as `HH:00`), `homeVentilationAdvice` (string, 1–400 chars), and `whatsappFamilyAlert` (string, 1–600 chars).
3. The server SHALL compute `reductionPercent` for each `rescheduledPlan` item from the hourly PM2.5 values as `round((pm[original] − pm[optimized]) / pm[original] × 100)`, and SHALL ignore any value the model supplies.
4. The server SHALL set `riskStatus` only from R5.1, and SHALL ignore any risk value the model supplies.
5. IF a `rescheduledPlan` item has an `optimizedSlot` outside the Daytime Range THEN the server SHALL drop that item.
6. The system SHALL return `whatsappFamilyAlert` in Roman Urdu. Before returning it, the server SHALL replace every `**` with `*` so the alert uses only single asterisks for bold text.
7. The server SHALL measure the time from just before the Groq request is sent to just after its response is received, and SHALL return it as `meta.latencyMs` (an integer in milliseconds).
8. The server SHALL abort the Groq request if no response arrives within 10000 ms.

### Requirement 7: Command-Center Dashboard UI

**User Story:** As a judge watching on a projector, I want a dense dashboard that I can read at a glance, so that I understand the results within seconds.

#### Acceptance Criteria

1. The system SHALL render the entire experience on one route (`/`). The layout SHALL be 12 columns at the `lg` breakpoint and above (control panel 4 columns, results 8 columns) and 1 column below it.
2. The header SHALL show the brand `SmogShield-LHR`, a pulsing green heartbeat dot, and the compliance badge `MODEL: llama-3.1-8b-instant (8B) | PROVIDER: Groq | LATENCY: {meta.latencyMs}ms`.
3. WHILE no Analysis Run has completed, OR the last run has `meta.latencyMs` = null, the badge SHALL show `LATENCY: —`.
4. WHEN an Analysis Run completes THEN the system SHALL show three hero cards:
   - US AQI and PM2.5, with the WHO Multiple and the AQI Band
   - Cigarette Equivalence
   - Safe Windows, with the single lowest hour highlighted
5. WHEN an Analysis Run completes THEN the system SHALL show a 24-bar hourly PM2.5 histogram. Each bar SHALL be coloured by the AQI Band of that hour's `us_aqi`.
6. The system SHALL colour every AQI Band indicator with that band's token in [design.md §UI Design System](design.md#ui-design-system).
7. The system SHALL show three tabs: `AI Schedule Optimizer`, `WhatsApp Family Alert`, and `README Testing Row`.
8. WHEN the user clicks the copy button in the WhatsApp tab THEN the system SHALL copy the alert text exactly to the clipboard and SHALL show a "Copied" confirmation for 2 seconds.

### Requirement 8: README Testing Row Exporter

**User Story:** As a participant, I want each demo run exported as a Markdown table row, so that I can fill the README Testing & Findings table quickly.

#### Acceptance Criteria

1. WHEN an Analysis Run completes, or Preset 3 is blocked by validation, THEN the `README Testing Row` tab SHALL show one Markdown table row with these 6 columns in order: Test Scenario, Input, Expected Output, Actual Outcome, Pass/Fail, Known Limitations.
2. The system SHALL also show the matching Markdown header row and separator row above the generated row.
3. The system SHALL replace every `|` character inside cell values with `\|`, and every newline with a space.
4. The system SHALL set Pass/Fail as follows:
   - Presets 1 and 2 and manual runs: `PASS` if the response is HTTP 200 with `ai` not null, otherwise `FAIL`.
   - Preset 3: `PASS` if validation blocked the submission, otherwise `FAIL`.
5. The tab SHALL provide a copy button that behaves like R7.8.

### Requirement 9: Error Handling and Fallback

**User Story:** As a presenter, I want the demo to keep working when an external API fails, so that a network problem doesn't ruin the presentation.

#### Acceptance Criteria

1. IF the Open-Meteo request fails, times out, or returns an invalid response (R4.5) THEN the server SHALL compute metrics from the Offline Sample and SHALL set `meta.dataSource` to `"offline_sample"`.
2. WHILE the displayed data comes from the Offline Sample, the dashboard SHALL show a visible `OFFLINE SAMPLE` badge next to the AQI hero card.
3. IF the Groq request fails, times out, returns a non-200 status, returns invalid JSON, or fails schema validation THEN the server SHALL still respond with HTTP 200, the computed `metrics`, `ai: null`, and a short `aiError` code.
4. WHILE `ai` is null the three AI tabs SHALL show the `aiError` message and a `Retry AI` button. The metric cards SHALL remain visible.
5. IF `GROQ_API_KEY` is not set THEN the server SHALL behave as in R9.3 with `aiError` = `AI_NOT_CONFIGURED`, and SHALL NOT include the reason in any client-visible stack trace.
6. IF the request body to `/api/smog` fails validation THEN the server SHALL respond with HTTP 400 and `{ "error": "INVALID_REQUEST", "fieldErrors": { … } }`, and SHALL NOT call Open-Meteo or Groq.

### Requirement 10: Security and Repository Deliverables

**User Story:** As a maintainer, I want secrets kept safe and the required deliverables present, so that the submission is safe and complete.

#### Acceptance Criteria

1. The system SHALL read `GROQ_API_KEY` only in server-side code. The client bundle SHALL NOT contain the key or any `NEXT_PUBLIC_` variable holding it.
2. The repository `.gitignore` SHALL exclude `.env`, `.env.local`, `.env.*.local`, `.next/`, and `node_modules/`.
3. The repository SHALL include an `.env.example` file containing `GROQ_API_KEY=` with no value.
4. The repository SHALL include an MIT `LICENSE`, and a `README.md` containing:
   - the 5 sections required by the hackathon manual
   - at least one Mermaid architecture diagram
   - a Testing & Findings table with at least 3 rows, one per preset
5. The system SHALL NOT include authentication, a database, or any route other than `/` and `/api/smog`.

### Requirement 11: Non-Functional Requirements

**User Story:** As a judge, I want the app to be fast, accessible, and readable on a projector, so that the demo runs smoothly for everyone.

#### Acceptance Criteria

1. WHEN both external APIs respond normally THEN an Analysis Run SHALL finish within 8 seconds, measured from click to rendered results.
2. The system SHALL meet WCAG 2.1 AA contrast: at least 4.5:1 for body text and at least 3:1 for text ≥ 24 px and for UI component boundaries.
3. The system SHALL make every control (zone pills, mode cards, inputs, presets, tabs, copy buttons) reachable and operable by keyboard alone, with a visible focus ring.
4. The system SHALL announce new Analysis Run results and errors through an `aria-live="polite"` region.
5. WHILE the user's OS has `prefers-reduced-motion: reduce` set, the system SHALL disable stagger and histogram-growth animations and SHALL render the final state immediately.
6. The system SHALL use a font size of at least 14 px for body text and at least 36 px for the primary number on each hero card.
7. The system SHALL show the whole dashboard without page scrolling on a 1920 × 1080 viewport.
