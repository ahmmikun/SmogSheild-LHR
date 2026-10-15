## 📝 Description
Briefly describe the purpose of this PR and the specific feature or fix implemented for **SmogShield-LHR**.

## 🔗 Related Issue / Specification
- Closes #(issue number)
- Mapped Requirement: (e.g. `R1`, `R5`, `R7` from `docs/requirements.md`)

## 🛠️ Changes Summary
- [ ] Telemetry or Calculation Engine (`lib/calc.ts`, `lib/openMeteo.ts`)
- [ ] AI Integration or Prompt Logic (`lib/groq.ts`, `lib/schemas.ts`)
- [ ] UI Component or Dashboard Layout (`components/`, `app/page.tsx`)
- [ ] Testing or Test Harness (`tests/`)
- [ ] Documentation (`README.md`, etc.)

## 🧪 Testing Performed
Describe how you verified these changes (e.g. `npm test`, manual testing with Preset 1/2/3, offline fallback test):

```bash
# Example:
npm test
```

## ✅ Hackathon & Quality Checklist
- [ ] **Strict 8B Model Limitation:** Uses only `llama-3.1-8b-instant` via Groq. No proprietary/closed-source models or models >8B.
- [ ] **Secret Isolation:** No API keys or tokens are hardcoded, logged, or bundled into client assets.
- [ ] **Deterministic Calculations:** All mathematical formulas (cigarettes, WHO multiple, AQI band) remain reproducible and uncoupled from LLM hallucinations.
- [ ] **Unit Tests:** New logic has corresponding test coverage in `tests/`.
- [ ] **Accessibility:** Colors meet WCAG 2.1 AA contrast and interactive elements support keyboard navigation.
