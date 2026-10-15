# Hackathon Agent Protocol

**Project:** Hackathon MVP  
**Agents:** Kiro CLI + Antigravity IDE  
**Mode:** Same project folder and shared Git working tree  
**Priority:** Ship a working MVP before the deadline.

## 1. Roles

### Kiro CLI — Primary Builder
- Implement core functionality, backend, APIs, and business logic.
- Fix critical integration and runtime issues.
- Keep `HACKATHON_STATUS.md` updated.
- Avoid overwriting changes made by Antigravity.

### Antigravity IDE — Secondary Builder
- Inspect the existing implementation before making changes.
- Work on independent tasks such as UI improvements, responsive design, validation, loading/error states, and testing.
- Avoid editing files owned by Kiro.
- Report blockers and integration requirements.

### Human Coordinator
- Assign tasks and approve overlapping changes.
- Resolve conflicts.
- Verify the demo and decide what ships.

## 2. Mandatory Rules

1. Read this file and `HACKATHON_STATUS.md` before starting work.
2. Run `git status --short` and inspect relevant changes before editing.
3. Both agents share the same working tree. Changes may appear immediately.
4. Never discard, reset, revert, or overwrite another agent's work.
5. Never run destructive commands such as `git reset --hard`, `git clean -fd`, or `git checkout .`.
6. Do not modify files owned by the other agent without approval.
7. Do not install dependencies or modify lockfiles unless necessary and approved.
8. Do not perform large refactors or redesign the entire project.
9. Never expose API keys, tokens, passwords, or `.env` contents.
10. Run tests before claiming that a feature works.
11. Record completed tasks, changed files, and blockers in `HACKATHON_STATUS.md`.
12. If changes conflict, stop and ask the coordinator instead of overwriting them.

## 3. Startup Procedure

From the project root, inspect the repository:

```powershell
git status --short
git diff --stat
```

Then:

1. Read `HACKATHON_STATUS.md`, if it exists.
2. Inspect the existing application and relevant files.
3. Identify the other agent's current task and owned files.
4. If the status file does not exist, create it using the template below.
5. Select one independent task that can be completed quickly.

Do not create a new project or replace existing implementation without approval.

## 4. Task Ownership

Maintain explicit file ownership in `HACKATHON_STATUS.md`.

**Default ownership:**

- Kiro: core logic, backend, API integration, and files it is actively modifying.
- Antigravity: independent UI improvements, validation, testing, and files not owned by Kiro.
- Shared files: require coordinator approval before both agents modify them.

Before editing, each agent must communicate:

- The task it will complete.
- The exact files it expects to change.
- Dependencies on the other agent's work.

If a task requires changes to another agent's files, request approval first.

## 5. Shared Handoff Protocol

Whenever an agent finishes a task or changes ownership:

1. Update `HACKATHON_STATUS.md`.
2. List the changed files.
3. Record commands executed and actual test results.
4. Identify blockers and integration requirements.
5. Tell the coordinator what is ready for review.

The receiving agent must reread the status file and inspect the latest changes before continuing.

**Important:** The agents do not automatically share conversation history. This file coordinates their work but does not provide automatic agent-to-agent messaging. The coordinator must explicitly ask each agent to reread it.

## 6. Status File Template

Create `HACKATHON_STATUS.md` with this structure:

```markdown
# Hackathon Status

## Goal
- MVP objective:
- Main demo flow:
- Must-work features:

## Current State
- Completed:
- In progress:
- Blocked:

## Task Ownership
- Kiro task:
- Kiro-owned files:
- Antigravity task:
- Antigravity-owned files:
- Shared files requiring approval:

## Handoff
- Latest changes:
- Integration requirements:
- Next highest-priority task:

## Verification
- Commands executed:
- Results:
- Not yet tested:
```

Preserve existing information when updating this file. Do not erase another agent's notes.

## 7. Implementation Rules

- Prioritize a working end-to-end demo over extra features.
- Make small, focused changes.
- Reuse existing components and APIs.
- Avoid unnecessary dependencies and configuration changes.
- Fix demo-blocking bugs before cosmetic issues.
- Do not claim that a test passed unless it was actually run.
- Never assume a feature works merely because the code was generated.

## 8. Final Verification

From the project root:

```powershell
git status --short
git diff --check
git diff --stat
```

Inspect the actual changes and run the project's existing build or test commands.

For npm projects, inspect available scripts with:

```powershell
npm run
```

Use the project's existing package manager. If it uses Bun, do not switch to npm or regenerate lockfiles unnecessarily.

Verify:

- The application starts.
- The main demo flow works.
- Frontend and backend integration works.
- Required environment variables are configured.
- No credentials or secrets have been committed.
- The build and relevant checks pass.

## 9. Deadline Strategy

1. **First:** establish the current state and ownership.
2. **Next:** implement core functionality and one independent secondary task in parallel.
3. **Then:** inspect changes, resolve integration issues, and test.
4. **Finally:** fix critical bugs and prepare the demo.
5. **Freeze:** stop adding features when the submission deadline approaches.

## Definition of Done

A task is complete when its changes are present, relevant checks have been run, the status file is updated, and the coordinator knows about any remaining limitations.

**Default rule:** When time is limited, choose a small, tested fix over a new feature. Preserve working code and ship the MVP.