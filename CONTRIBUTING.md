# Contributing to SmogShield-LHR 🌫️🛡️

Thank you for your interest in contributing to **SmogShield-LHR**! We welcome contributions that help improve air quality awareness, exposure modeling, responsive user experience, and accessible health guidance for the citizens of Lahore.

---

## 📑 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Hackathon & Model Compliance Rules](#-hackathon--model-compliance-rules)
- [Development Setup](#-development-setup)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Commit Conventions](#-commit-conventions)
- [Review Checklist](#-review-checklist)

---

## 📜 Code of Conduct

All contributors and maintainers are expected to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please ensure respectful and welcoming interactions across issues, PRs, and discussions.

---

## 🚨 Hackathon & Model Compliance Rules

Because this project is built for Hacktoberfest Lahore 2026 under strict open-weight hackathon guardrails, every contribution **must** adhere to the following non-negotiable rules:

1. **Strict 8B Model Limitation:**  
   Runtime LLM logic (`app/api/smog/route.ts`) must exclusively invoke `llama-3.1-8b-instant` via the Groq Cloud API. Do **not** import, install, or call OpenAI, Anthropic Claude, Google Gemini, or any model with >8B parameters.
2. **Deterministic Safety Calculations:**  
   Risk bands (`GOOD` through `HAZARDOUS`), WHO safety multiples, Berkeley Earth cigarette equivalence, and safe commute hours are calculated deterministically in code (`lib/calc.ts`). The LLM must **never** be permitted to compute arithmetic or decide health risk severity.
3. **Secret Isolation:**  
   `GROQ_API_KEY` is loaded purely server-side. Never expose it in client code, public assets, or committed files (`.env`, `.env.local` must remain in `.gitignore`).
4. **Single-Viewport Flow:**  
   The application operates as a single-viewport dashboard (`app/page.tsx`). Do not add multi-page routing, authentication layers, or external database setups.

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/MLH-Hacktoberfest.git
   cd MLH-Hacktoberfest
   ```

2. **Set up upstream remote:**
   ```bash
   git remote add upstream https://github.com/ahmmikun/MLH-Hacktoberfest.git
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Add a valid Groq API key:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Run tests:**
   ```bash
   npm test
   ```

---

## 💡 How Can I Contribute?

### Reporting Bugs
- Search existing issues to confirm the bug hasn't already been reported.
- Use the **[Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)** to provide exact steps to reproduce, the selected zone/mode, and expected vs. actual outcomes.

### Suggesting Features
- Review the [Requirements Document (docs/requirements.md)](docs/requirements.md) and [Design Document (docs/design.md)](docs/design.md) to understand current scope.
- Use the **[Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)** to explain the problem and proposed enhancement within project constraints.

### Submitting a Pull Request
1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/add-safe-window-marker
   ```
2. Write clean, accessible code conforming to the UI design tokens and WCAG 2.1 AA standards.
3. Add unit tests for any new deterministic calculation or utility in `tests/`.
4. Ensure all tests pass:
   ```bash
   npm test
   ```
5. Commit using Conventional Commits and push to your fork:
   ```bash
   git push origin feat/add-safe-window-marker
   ```
6. Open a Pull Request using our standard [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Scope | Example |
| :--- | :--- | :--- |
| `feat` | New feature or capability | `feat(calc): support custom particulate weight` |
| `fix` | Bug fix | `fix(groq): normalize multi-asterisk bolding` |
| `docs` | Documentation update | `docs(readme): add testing matrix findings` |
| `test` | Unit or integration test | `test(calc): verify cigarette conversion boundaries` |
| `refactor` | Code refactoring without behavior change | `refactor(ui): extract hero telemetry card` |
| `style` | Formatting and styling | `style: improve contrast on dark mode chip` |

---

## ✅ Review Checklist

Before your PR can be merged, maintainers will verify:
- [ ] Strictly adheres to `llama-3.1-8b-instant` on Groq.
- [ ] No API keys, tokens, or credentials committed or leaked to client bundle.
- [ ] Deterministic calculations verified against specifications.
- [ ] Full test suite passes without regressions (`npm test`).
- [ ] High-contrast, accessible UI (keyboard navigation, `aria-live` support).
