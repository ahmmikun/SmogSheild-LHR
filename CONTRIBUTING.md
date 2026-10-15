# Contributing to MLH-Hacktoberfest 🎃

Thank you for taking the time to contribute! 🎉 Contributions of all kinds are welcomed and appreciated—whether you're fixing bugs, adding new features, improving documentation, or helping review pull requests.

---

## 📑 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Hacktoberfest Guidelines](#-hacktoberfest-guidelines)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Making a Pull Request](#making-a-pull-request)
- [Development Workflow](#-development-workflow)
- [Commit Message Conventions](#-commit-message-conventions)
- [PR Review Process](#-pr-review-process)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🎃 Hacktoberfest Guidelines

Hacktoberfest encourages meaningful open-source contributions. To ensure quality and prevent spam:

- **Quality over Quantity:** Low-effort or spam pull requests (e.g., fixing minor typos in READMEs without substance, reordering lines without purpose) will be tagged as `spam` or `invalid` and will not count towards Hacktoberfest.
- **Find or Open an Issue:** Before submitting a PR, make sure there is an open issue for it, or create one and discuss it.
- **Wait for Assignment:** Please wait until a maintainer assigns the issue to you before working on it.

---

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to see if the problem has already been reported.

When creating an issue, please use the **Bug Report Template** and include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs actual behavior.
- Screenshots or error logs if applicable.

### Suggesting Features

Feature requests are welcome! Use the **Feature Request Template** to describe:
- The problem you are trying to solve.
- Your proposed solution or enhancement.
- Any alternative solutions considered.

---

## 🛠️ Development Workflow

1. **Fork the Repository:**
   Click the **Fork** button on GitHub to create your own copy of the repo.

2. **Clone the Forked Repository:**
   ```bash
   git clone https://github.com/<your-username>/MLH-Hacktoberfest.git
   cd MLH-Hacktoberfest
   ```

3. **Set Up Upstream Remote:**
   ```bash
   git remote add upstream https://github.com/ahmmikun/MLH-Hacktoberfest.git
   ```

4. **Create a New Branch:**
   Always create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

5. **Make Your Changes:**
   Write clean, readable code and test your changes thoroughly.

6. **Commit Your Changes:**
   Follow our [Commit Message Conventions](#-commit-message-conventions).
   ```bash
   git add .
   git commit -m "feat: add user profile card component"
   ```

7. **Keep Your Branch Updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

8. **Push to Your Fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Submit a Pull Request (PR):**
   Open a PR against the `main` branch of this repository using our PR template.

---

## 📝 Commit Message Conventions

We recommend following [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
| :--- | :--- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semi-colons, etc. (no functional code change) |
| `refactor` | Refactoring code without changing its behavior |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, tooling updates, dependencies |

**Example:**
```bash
git commit -m "feat(ui): add responsive navigation bar"
```

---

## 🔍 PR Review Process

- Maintainers will review your pull request as soon as possible.
- Please respond constructively to review comments or requested changes.
- Once approved, a maintainer will merge your PR!

Thank you for contributing to open source! 🚀
