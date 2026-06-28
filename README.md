# RepertoireLab

**Build, import, study, and drill your chess opening repertoire — in the browser.**

[Getting started](./docs/getting-started.md) · [Documentation](./docs/README.md) · [User guide](./docs/user-guide.md) · [Development](./docs/development.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)

---

## Overview

**RepertoireLab** is a client-side chess repertoire platform. Import PGN files or build lines move-by-move on an interactive board, explore full variation trees, study with repertoire-constrained moves, and run spaced opening drills against an auto-playing opponent.

Everything runs in your browser. Repertoires, study sessions, and training history are stored locally — no account required.

```
  Import PGN ──► Repertoire library ──► Study mode ──► Training drills
       │                │                    │                 │
       └──── Build from scratch ────────────┴─────────────────┘
```

## Features

| Area | What you get |
|------|----------------|
| **PGN import** | Parse multi-game databases, preserve comments, annotations, and variation trees |
| **Repertoire builder** | Play moves on the board, register complete lines, branch into alternatives |
| **Study mode** | Walk your tree interactively — only repertoire moves are legal |
| **Engine analysis** | Optional Stockfish eval in study mode (client-side, toggle on) |
| **Opening training** | Drill lines as White or Black; opponent replies automatically; pass/fail feedback |
| **Move navigation** | Arrow keys and scroll wheel to step through move chains (study, builder, free play) |
| **Free play board** | Standard chess game with full move history navigation |
| **Local library** | Multiple repertoires, session resume, training stats per repertoire |

## Quick start

**Requirements:** Node.js 20+ and npm.

```bash
git clone <your-repo-url>
cd chess/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

See [Getting started](./docs/getting-started.md) for a full walkthrough.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing page |
| `/upload` | Import PGN (file or paste) |
| `/repertoires` | Repertoire library |
| `/repertoires/new` | Build a repertoire from scratch |
| `/repertoires/[id]/edit` | Edit a created repertoire |
| `/study/[id]` | Interactive study mode |
| `/training` | Training hub |
| `/training/[id]` | Training setup (color, line count) |
| `/training/[id]/session` | Active training session |
| `/board` | Free play chess board |

## Tech stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI:** [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Board:** [Chessground](https://github.com/lichess-org/chessground) + [chess.js](https://github.com/jhlywa/chess.js)
- **PGN parsing:** [@echecs/pgn](https://www.npmjs.com/package/@echecs/pgn)
- **Testing:** [Vitest](https://vitest.dev/)
- **Persistence:** `localStorage` (client-only)

## Project structure

```
chess/
├── README.md                 # You are here
├── docs/                     # Full documentation
└── frontend/                 # Next.js application
    ├── src/
    │   ├── app/              # Routes and pages
    │   ├── components/       # UI (chess, pgn, repertoires, training)
    │   ├── hooks/            # React hooks (study, training, navigation)
    │   └── lib/              # Core logic (pgn, repertoires, training, chess)
    └── package.json
```

## Documentation

| Document | Description |
|----------|-------------|
| [Documentation index](./docs/README.md) | Hub for all docs |
| [Getting started](./docs/getting-started.md) | Install, first repertoire, first study session |
| [User guide](./docs/user-guide.md) | Complete feature reference |
| [Keyboard shortcuts](./docs/keyboard-shortcuts.md) | Arrow keys and scroll-wheel navigation |
| [Architecture](./docs/architecture.md) | System design and module boundaries |
| [Data & storage](./docs/data-and-storage.md) | localStorage schema and limits |
| [Development](./docs/development.md) | Contributing, testing, conventions |
| [Deployment](./docs/deployment.md) | Build and deploy to static hosts |

## Data privacy

RepertoireLab stores all data in your browser's `localStorage`. Nothing is sent to a server unless you deploy the app yourself and add backend services. Clearing site data removes your repertoires and training history.

## Contributing

Read [Development](./docs/development.md) before opening a pull request. Run `npm test` and `npm run lint` in `frontend/` — both should pass.

---

<sub>Built for players who take opening preparation seriously.</sub>
