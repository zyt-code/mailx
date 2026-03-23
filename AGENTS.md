# Repository Guidelines

## Project Structure & Module Organization
Mailx is a Tauri v2 desktop app with a SvelteKit frontend.
- Frontend app code: `src/`
- Routes/pages: `src/routes/`
- Shared UI/components/stores/db wrappers: `src/lib/`
- Rust backend (Tauri commands, IMAP/SMTP, DB): `src-tauri/src/`
- Rust tests: `src-tauri/test/` (wired via `#[cfg(test)]` modules)
- Static assets: `static/`, app icons/capabilities: `src-tauri/icons/`, `src-tauri/capabilities/`
- Planning/design docs: `docs/plans/`

## Build, Test, and Development Commands
- `npm install`: install Node dependencies.
- `npm run tauri dev`: run desktop app in development (Tauri + Vite).
- `npm run check`: run Svelte/TypeScript checks (`svelte-check`).
- `npm run check:watch`: type check in watch mode.
- `npm run tauri build`: build production desktop bundles.
- `cargo test --manifest-path src-tauri/Cargo.toml`: run Rust tests.

Note: `src-tauri/tauri.conf.json` uses `bun run dev/build` as pre-commands, so keep Bun available locally.

## Coding Style & Naming Conventions
- Frontend: TypeScript + Svelte 5 runes; keep imports typed and prefer `$state`, `$derived`, `$effect`.
- Follow existing per-file formatting (current codebase mixes tabs/2-space blocks in Svelte/TS files).
- Naming: components in `PascalCase.svelte`, stores/utilities in `camelCase.ts`, route folders in lowercase (`settings/accounts/[id]`).
- Rust: `snake_case` for functions/modules, `CamelCase` for types; run `cargo fmt` before submitting backend changes.

## Testing Guidelines
- Primary automated tests are Rust unit tests under `src-tauri/test/*_tests.rs`.
- Name tests clearly by behavior (example: `test_validate_email`, `test_generate_message_id`).
- Run backend tests before PRs: `cargo test --manifest-path src-tauri/Cargo.toml`.
- For frontend changes, at minimum run `npm run check` and manually verify key flows in `npm run tauri dev`.

## Commit & Pull Request Guidelines
- Use Conventional Commit style when possible: `feat:`, `fix:`, `chore:`, `perf:`, `style:`.
- Keep commits scoped and imperative (example: `feat: sync read status to IMAP server`).
- PRs should include:
  - concise summary and rationale
  - linked issue/task (if available)
  - screenshots/GIFs for UI changes
  - test/verification notes (commands run)

## Configuration Safety Notes
- Keep frontend/backend defaults aligned; shared provider defaults live in `src/lib/config/provider-defaults.json`.
- Do not hardcode local-dev-only behavior in production paths; use config or dedicated test harnesses.

## Automation Policy
- Do not add or reintroduce GitHub Actions workflows unless the user explicitly asks for them.
