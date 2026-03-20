# Mailx

A modern, privacy-focused desktop email client built with Tauri, SvelteKit, and Rust.

![Mailx](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Rust](https://img.shields.io/badge/Rust-2021-orange)
![Svelte](https://img.shields.io/badge/Svelte-5-purple)

## Features

- **Multiple Account Support** - Manage multiple email accounts in one place
- **IMAP/SMTP Integration** - Full email sync with IMAP servers and outgoing SMTP support
- **Rich Text Editor** - Compose emails with formatting using TipTap editor
- **Keyboard Shortcuts** - Efficient workflow with customizable shortcuts
- **Local Storage** - All data stored locally using SQLite
- **Desktop Native** - System tray support, notifications, and native window controls
- **Cross-Platform** - Works on macOS, Windows, and Linux

## Tech Stack

### Frontend
- **Svelte 5** with runes for reactive UI
- **SvelteKit** for routing and SSR
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **TipTap** for rich text editing
- **Lucide** for icons

### Backend
- **Tauri 2** for native desktop app
- **Rust** for performance-critical operations
- **SQLite** via `rusqlite` for local database
- **lettre** for SMTP email sending
- **async-imap** for IMAP email retrieval

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Bun (recommended) or npm/pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/zyt-code/mailx.git
cd mailx

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start Tauri development server |
| `npm run tauri build` | Build production desktop app |
| `npm run check` | Run Svelte/TypeScript type checking |
| `npm run check:watch` | Watch mode for type checking |

### Backend Testing

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Project Structure

```
mailx/
├── src/                      # Frontend code
│   ├── lib/
│   │   ├── components/       # Svelte components
│   │   │   ├── compose/      # Email composer components
│   │   │   ├── layout/       # Layout components (Sidebar, MailList)
│   │   │   └── mail/         # Mail display components
│   │   ├── config/           # Configuration files
│   │   ├── db/               # Database utilities
│   │   ├── accounts/         # Account management
│   │   └── stores/           # Svelte stores
│   └── routes/               # SvelteKit routes
│       └── settings/         # Settings pages
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs            # Main library
│   │   ├── db.rs             # Database operations
│   │   ├── imap.rs           # IMAP client
│   │   └── smtp.rs           # SMTP client
│   └── Cargo.toml            # Rust dependencies
├── static/                   # Static assets
└── docs/                     # Documentation
```

## Architecture

### Frontend Architecture

The frontend uses Svelte 5 with runes (`$state`, `$derived`, `$effect`) for reactive state management:

- **Components** are organized by feature (compose, layout, mail)
- **Stores** handle global state (preferences, accounts)
- **Routes** define the application pages

### Backend Architecture

The Rust backend provides native functionality:

- **Database Layer** - SQLite for storing accounts, emails, and drafts
- **IMAP Client** - Async IMAP for fetching emails
- **SMTP Client** - Email sending via SMTP
- **Tauri Commands** - Bridge between frontend and Rust

## Email Configuration

Mailx supports standard IMAP/SMTP configuration:

```
IMAP Server: imap.example.com (port 993)
SMTP Server: smtp.example.com (port 587 or 465)
```

### Supported Providers

- Gmail
- Outlook / Hotmail
- iCloud
- Custom IMAP/SMTP servers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/)
- [Svelte](https://svelte.dev/)
- [TipTap](https://tiptap.dev/)
- [Rust](https://www.rust-lang.org/)
