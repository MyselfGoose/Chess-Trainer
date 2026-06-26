# RepertoireLab Documentation

Welcome to the RepertoireLab documentation. This guide covers everything from your first import to deploying the app in production.

## Who this is for

| Audience | Start here |
|----------|------------|
| **Players & coaches** | [Getting started](./getting-started.md) → [User guide](./user-guide.md) |
| **Developers** | [Development](./development.md) → [Architecture](./architecture.md) |
| **Operators** | [Deployment](./deployment.md) → [Data & storage](./data-and-storage.md) |

## Documentation map

### Using RepertoireLab

| Guide | Description |
|-------|-------------|
| [Getting started](./getting-started.md) | Install the app and complete your first workflow |
| [User guide](./user-guide.md) | Full feature reference: import, build, study, train |
| [Keyboard shortcuts](./keyboard-shortcuts.md) | Move navigation with arrow keys and scroll wheel |

### Building & operating

| Guide | Description |
|-------|-------------|
| [Architecture](./architecture.md) | How the app is structured and how data flows |
| [Data & storage](./data-and-storage.md) | localStorage keys, limits, and data models |
| [Development](./development.md) | Local setup, testing, linting, conventions |
| [Deployment](./deployment.md) | Production builds and hosting options |

## Core concepts

Before diving in, it helps to know three ideas the whole app is built around:

### 1. Repertoire

A **repertoire** is a named collection of chess games stored as variation trees. Each repertoire is either:

- **Imported** — created from a PGN file (all leaf lines are trainable)
- **Created** — built on the board (only **registered** leaf lines are trainable)

### 2. Study tree

Every game is a **tree of positions** (`StudyGame`). Each node stores a FEN, SAN, parent/children links, and optional PGN metadata (comments, NAGs, arrows). Study mode lets you walk this tree on the board.

### 3. Training line

A **training line** is a complete path from the starting position to a leaf node. During training you play your moves; the opponent's repertoire moves are played automatically. Wrong moves fail the line.

## Feature overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RepertoireLab                            │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│   Import    │    Build    │    Study     │      Training        │
│   (PGN)     │  (board)    │  (board)     │   (drill lines)      │
├─────────────┴─────────────┴──────────────┴──────────────────────┤
│              Local repertoire library (localStorage)            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick links

- [Repository README](../README.md)
- Application lives in [`frontend/`](../frontend/)
- Source routes: [`frontend/src/app/`](../frontend/src/app/)

## Getting help

1. Check the [User guide](./user-guide.md) for how a feature is supposed to work.
2. Review [Data & storage](./data-and-storage.md) if repertoires disappear or fail to save.
3. See [Development](./development.md) for running tests and debugging locally.
