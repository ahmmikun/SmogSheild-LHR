# Security Policy: SmogShield-LHR

## Supported Versions

Only the current `main` branch of SmogShield-LHR receives active security updates and vulnerability patches:

| Branch / Version | Supported          |
| :--------------- | :----------------- |
| `main`           | :white_check_mark: |

---

## 🔐 Key Security Principles for This Project

SmogShield-LHR handles environmental telemetry and AI-driven advisory logic. To maintain security integrity:

1. **Zero Secret Leakage:**  
   The Groq Cloud API key (`GROQ_API_KEY`) must strictly exist in server-side runtime environments (`app/api/smog/route.ts`). It must **never** be prefixed with `NEXT_PUBLIC_` or bundled into client assets.
2. **Keyless Public Data:**  
   Meteorological data is fetched directly from the keyless Open-Meteo REST API on the server side with strict timeout controls (5000 ms) and error boundaries.
3. **No User Data Persistence:**  
   SmogShield-LHR is a stateless, single-viewport dashboard. No personal routines or user data are stored in databases or transmitted to third parties other than the prompt payload sent to Groq.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability or potential credential leak:

1. **Do not create a public issue, discussion, or pull request.**
2. Report the vulnerability privately via [GitHub Private Vulnerability Reporting](https://github.com/ahmmikun/MLH-Hacktoberfest/security/advisories/new).
3. If GitHub Vulnerability Reporting is unavailable, contact the project maintainer directly via GitHub.

### What to Include in Your Report
- A detailed summary of the vulnerability (e.g., secret exposure, SSRF risk, unhandled payload injection).
- Step-by-step reproduction instructions or a minimal proof of concept.
- The potential impact on users, maintainers, or infrastructure.
- Suggested remediation or patch, if available.

We appreciate responsible disclosure and aim to acknowledge all reports within 48 hours.
