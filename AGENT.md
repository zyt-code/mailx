# AGENT Guidelines

- Maintain parity between frontend and backend configuration sources; shared defaults live in `config/provider-defaults.json`.
- **New rule:** Any adaptations for local development environments (e.g., GreenMail) must be driven by configuration files or test harnesses. Never hardcode dev/test logic inside production execution paths.

## Mandatory TDD Workflow (Strict)

All feature work and bug fixes must follow **Red -> Green -> Refactor**. Skipping steps is not allowed.

1. **Red (write failing test first)**
   - Backend behavior: add/extend tests in `src-tauri/test/*_tests.rs`.
   - Frontend behavior: add/extend automated tests for the touched logic (create test harness first if missing).
   - Run the targeted test and confirm it fails for the expected reason.
2. **Green (minimal implementation)**
   - Implement the smallest production change in `src/` or `src-tauri/src/` to make the failing test pass.
   - Do not include opportunistic refactors in this step.
3. **Refactor (safe cleanup)**
   - Improve naming, structure, and duplication while keeping tests green.
4. **Quality gates before commit**
   - `cargo test --manifest-path src-tauri/Cargo.toml`
   - `npm run check`
5. **PR evidence requirement**
   - Include: failing test case (Red), passing result (Green), and final verification commands.
