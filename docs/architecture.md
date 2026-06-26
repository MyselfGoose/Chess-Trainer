# Architecture

Technical overview of RepertoireLab's design, module boundaries, and data flow.

## High-level design

RepertoireLab is a **client-only** Next.js application. All chess logic, PGN parsing, repertoire storage, and training run in the browser. There is no backend API in the default configuration.

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
│  pages (app/) ──► components ──► hooks ──► lib (pure logic) │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   localStorage   │
                    └──────────────────┘
```

### Design principles

1. **Pure logic in `lib/`** — parsing, tree operations, training engine, and navigation are framework-agnostic and unit-tested.
2. **Hooks bridge UI and logic** — React hooks own client state, hydration, and persistence side effects.
3. **Tree-first model** — repertoires are variation trees (`StudyGame`), not flat move lists.
4. **Progressive enhancement** — pages hydrate from `localStorage` on mount; SSR renders shell without user data.

---

## Directory structure

```
frontend/src/
├── app/                    # Routes (Next.js App Router)
│   ├── page.tsx            # Landing
│   ├── upload/             # PGN import
│   ├── repertoires/        # Library, builder, edit
│   ├── study/[id]/         # Study mode
│   ├── training/           # Training hub, setup, session
│   └── board/              # Free play
│
├── components/
│   ├── chess/              # ChessBoard, PromotionDialog, navigation bindings
│   ├── layout/             # Navbar
│   ├── pgn/                # Upload, study panel, path bar, move choices
│   ├── repertoires/        # Library cards, builder UI
│   └── training/           # Training session UI
│
├── hooks/
│   ├── useChessGame.ts         # Free play + linear history
│   ├── usePgnStudy.ts          # Study mode state
│   ├── useRepertoireBuilder.ts # Builder state
│   ├── useTrainingSession.ts   # Training session + timers
│   ├── useMoveNavigation.ts    # Keyboard + wheel listeners
│   └── useRepertoires.ts       # Library CRUD
│
└── lib/
    ├── chess/              # chess.js wrapper, destinations, types
    ├── pgn/                # Parse, export, tree build, navigation, stats
    ├── repertoires/        # Storage, session, tree builder
    ├── training/           # Line extraction, engine, history
    └── navigation/         # Tree + linear move navigation
```

---

## Core data models

### StudyNode

A single position in a variation tree.

```typescript
interface StudyNode {
  id: string;
  san: string;
  fen: string;
  color: "w" | "b" | null;
  ply: number;
  parentId: string | null;
  childIds: string[];
  pathLabel: string;
  isVariation: boolean;
  // Optional PGN metadata: comment, annotations, arrows, squares, clock, eval
}
```

### StudyGame

A game tree with PGN headers.

```typescript
interface StudyGame {
  meta: Record<string, string>;  // PGN headers (Event, White, Black, …)
  result: string;
  startFen: string;
  rootId: string;
  nodes: Record<string, StudyNode>;
}
```

### Repertoire

```typescript
interface Repertoire {
  id: string;
  name: string;
  source: "imported" | "created";
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  games: StudyGame[];
  registeredLeafIds: string[];   // Meaningful for created repertoires
}
```

See [Data & storage](./data-and-storage.md) for persistence details.

---

## Module responsibilities

### `lib/pgn`

| Module | Responsibility |
|--------|----------------|
| `parse.ts` | PGN text → `StudyGame[]` via `@echecs/pgn` |
| `buildTree.ts` | Normalized tree construction |
| `navigation.ts` | Move choices, repertoire destinations, promotion matching |
| `stats.ts` | Line count, depth, variation count |
| `export.ts` | `StudyGame` → PGN text, file download |
| `storage.ts` | Legacy PGN study storage (migration) |

### `lib/repertoires`

| Module | Responsibility |
|--------|----------------|
| `storage.ts` | CRUD for repertoire catalog in `localStorage` |
| `session.ts` | Per-repertoire study session (current node, game index) |
| `treeBuilder.ts` | Create games, apply moves, register lines, undo |

### `lib/training`

| Module | Responsibility |
|--------|----------------|
| `lines.ts` | Extract trainable lines, filter by color, shuffle |
| `engine.ts` | Pure state machine: active play, pass/fail, summary |
| `history.ts` | Training session history and per-repertoire stats |

### `lib/navigation`

| Module | Responsibility |
|--------|----------------|
| `treeNavigation.ts` | Tip tracking, forward/back along active branch |
| `playHistory.ts` | Linear move list for free play |
| `keyboard.ts` | Focus detection for shortcut gating |

### `lib/chess`

| Module | Responsibility |
|--------|----------------|
| `game.ts` | `ChessGame` wrapper around chess.js |
| `destinations.ts` | Legal move maps for Chessground |

---

## Key data flows

### PGN import

```
PGN file/text
    → parsePgnDatabase()
    → StudyGame[]
    → createRepertoire({ source: "imported", games })
    → localStorage catalog
```

### Study mode

```
getRepertoire(id) + loadStudySession(id)
    → usePgnStudy hook
    → currentNodeId + tipNodeId
    → board FEN + repertoireDests
    → user move → findChoiceByMove → navigate to child node
    → persistStudySession()
```

### Training session

```
getRepertoire(id)
    → extractTrainingLines() + filterLinesForColor() + shuffle
    → useTrainingSession hook
    → engine state machine (lib/training/engine.ts)
    → opponent auto-play via setTimeout (~350ms)
    → on complete → saveTrainingSession(summary)
```

### Move navigation (tree)

```
Arrow key / scroll
    → useMoveNavigation
    → goBack / goForward / goToStart / goToEnd
    → treeNavigation helpers (tip-aware forward)
    → update currentNodeId (+ resolve tip)
```

---

## UI layer

### ChessBoard

Wraps **Chessground** with two modes:

| Mode | Behavior |
|------|----------|
| `play` | All legal moves via chess.js |
| `study` | Only repertoire destinations; view-only when no moves available |

### Hooks as state owners

| Hook | Owns |
|------|------|
| `usePgnStudy` | Repertoire, current node, tip, session persistence |
| `useRepertoireBuilder` | Mutable tree, registered lines, dirty flag |
| `useChessGame` | Engine state, linear history, promotion pending |
| `useTrainingSession` | Engine state, auto-play timers, session save |

---

## Testing strategy

Unit tests (Vitest) focus on pure logic:

| Area | Test file |
|------|-----------|
| PGN parsing | `lib/pgn/pgn.test.ts` |
| Tree builder | `lib/repertoires/treeBuilder.test.ts` |
| Storage | `lib/repertoires/storage.test.ts` |
| Training lines/engine | `lib/training/lines.test.ts`, `engine.test.ts` |
| Navigation | `lib/navigation/*.test.ts` |
| Chess wrapper | `lib/chess/chess.test.ts` |

UI components are not snapshot-tested; behavior is validated through lib and hook integration.

---

## Extension points

Common areas for future development:

| Extension | Natural location |
|-----------|------------------|
| Cloud sync / accounts | New `lib/api/` + replace `storage.ts` backend |
| Engine analysis | `lib/chess/` or new `lib/engine/` |
| Spaced repetition scheduling | `lib/training/` |
| PGN export from library | Already in `lib/pgn/export.ts` |
| Opening name database | `lib/pgn/` metadata enrichment |

---

## Related docs

- [Data & storage](./data-and-storage.md) — localStorage keys and limits
- [Development](./development.md) — running tests and local workflow
- [Deployment](./deployment.md) — production hosting
