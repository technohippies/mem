# Mem

A spaced repetition flashcard app for Farcaster. Study and share flashcard decks with the Farcaster community.

## Features

- 📱 Progressive Web App (PWA) with offline support
- 🔄 Spaced repetition using the FSRS algorithm
- 🌐 Decentralized storage with OrbisDB
- 💾 Local-first architecture - study offline, sync when ready
- 🎯 Smart study sessions with daily card limits
- 📊 Detailed progress tracking
- 🔍 Browse and discover community decks
- 🔐 Connect with your Farcaster wallet

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: TailwindCSS + Radix UI
- **Storage**: 
  - Local: IndexedDB for offline-first storage
  - Remote: OrbisDB (Ceramic) for decentralized data
- **Auth**: AppKit + WalletConnect for Farcaster auth
- **PWA**: Vite PWA for offline capabilities
- **Algorithms**: FSRS for spaced repetition

## Development

### Prerequisites

- Node.js 18+
- Bun

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mem.git
cd mem
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your OrbisDB credentials to `.env`

5. Start the development server:
```bash
bun run dev
```

### Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # Base UI components
│   ├── core/         # Core feature components
│   ├── auth/         # Authentication components
│   └── pages/        # Page components
├── contexts/         # React contexts
├── db/              # OrbisDB setup and models
├── hooks/           # Custom React hooks
├── services/        # Core services
│   ├── storage/     # Storage implementations
│   ├── sync/        # Data synchronization
│   └── fsrs/        # Spaced repetition algorithm
├── types/           # TypeScript types
└── stories/         # Storybook stories
```

## Features in Detail

### Offline-First Architecture
- Study anytime, anywhere - no internet required
- Changes sync automatically when back online
- Full PWA support for native app-like experience

### Smart Study Sessions
- Daily new card limits to prevent overwhelm
- Review cards based on FSRS algorithm
- Track study streaks and progress

### Community Integration
- Browse decks created by the community
- Study progress syncs to OrbisDB
- Future: Share decks, follow creators, and more

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a PR.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.
