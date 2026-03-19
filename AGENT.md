# AGENT Guidelines

- Maintain parity between frontend and backend configuration sources; shared defaults live in `config/provider-defaults.json`.
- **New rule:** Any adaptations for local development environments (e.g., GreenMail) must be driven by configuration files or test harnesses. Never hardcode dev/test logic inside production execution paths.
