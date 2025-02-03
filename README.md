# Anki Farcaster

A decentralized spaced repetition learning app built on Farcaster.

## Features

- Create and study flashcard decks
- Spaced repetition using the FSRS algorithm
- Social features through Farcaster
- Local-first with offline support
- Premium encrypted decks using Lit Protocol

## Tech Stack

- React + TypeScript
- Vite for bundling
- TailwindCSS + shadcn/ui for styling
- SQLite for local storage (development)
- Ceramic for decentralized storage (production)
- Farcaster for social features
- Lit Protocol for encryption

## Development

### Prerequisites

- Node.js 18+
- Bun
- SQLite3

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/anki-farcaster.git
cd anki-farcaster
```

2. Install dependencies:
```bash
bun install
```

3. Initialize the development database:
```bash
bun run init-db
```

4. Start the development server:
```bash
bun run dev
```

5. Start Storybook (optional):
```bash
bun run storybook
```

### Project Structure

```
src/
├── components/         # React components
│   ├── ui/            # Base UI components
│   ├── core/          # Core feature components
│   ├── layout/        # Layout components
│   └── pages/         # Page components
├── hooks/             # Custom React hooks
├── services/          # External service integrations
├── styles/            # Global styles
├── types/             # TypeScript type definitions
└── db/                # Database setup and models
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.
