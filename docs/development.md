# Development

Guide for contributors working on the RepertoireLab codebase.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 9+ |

## Setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Next.js with Turbopack hot reload |
| Build | `npm run build` | Production build + type check |
| Start | `npm run start` | Serve production build |
| Test | `npm test` | Run Vitest once |
| Test watch | `npx vitest` | Watch mode (not in package.json — use directly) |
| Lint | `npm run lint` | ESLint via `eslint-config-next` |

### Pre-commit checklist

```bash
npm test && npm run lint && npm run build
```

All three should pass before opening a pull request.

---

## Project conventions

### TypeScript

- Strict mode enabled — no unnecessary `any`
- Validate external/untrusted data at boundaries (PGN parse results, localStorage reads)
- Prefer explicit interfaces for public APIs in `lib/`

### File organization

| Layer | Location | Rules |
|-------|----------|-------|
| Routes | `src/app/` | Thin pages; delegate to components and hooks |
| UI | `src/components/` | Presentational; minimal business logic |
| State | `src/hooks/` | Client state, effects, localStorage side effects |
| Logic | `src/lib/` | Pure functions; no React imports |

### Naming

- Hooks: `useThing.ts` → `useThing()`
- Components: PascalCase files and exports
- Lib modules: camelCase functions, PascalCase types
- Tests: colocated `*.test.ts` next to source

### Styling

- Tailwind CSS utility classes
- Chessground styles in `src/styles/chess/`
- Layout uses `h-dvh` / `min-h-0` patterns to prevent double scrollbars on board pages

### Chess board

- **Chessground** for rendering and drag-drop
- **chess.js** for rules and FEN
- Board modes: `play` (free) vs `study` (repertoire-constrained)

---

## Testing

Tests use **Vitest** without a DOM environment (lib tests only).

```bash
npm test                    # Run all tests
npx vitest src/lib/pgn      # Run specific directory
npx vitest -t "treeNavigation"  # Filter by name
```

### What to test

| Test | Example |
|------|---------|
| PGN parsing edge cases | `lib/pgn/pgn.test.ts` |
| Tree mutations | `lib/repertoires/treeBuilder.test.ts` |
| Training engine transitions | `lib/training/engine.test.ts` |
| Navigation logic | `lib/navigation/*.test.ts` |
| Storage validation | `lib/repertoires/storage.test.ts` |

### What not to test (currently)

- React component rendering (no Testing Library setup)
- Chessground integration (visual/manual)
- Full E2E flows

When adding features, **add unit tests for pure logic** in `lib/`.

---

## Key hooks

| Hook | File | Purpose |
|------|------|---------|
| `usePgnStudy` | `hooks/usePgnStudy.ts` | Study mode state + session persistence |
| `useRepertoireBuilder` | `hooks/useRepertoireBuilder.ts` | Mutable tree building |
| `useChessGame` | `hooks/useChessGame.ts` | Free play + history |
| `useTrainingSession` | `hooks/useTrainingSession.ts` | Training loop + auto-play |
| `useMoveNavigation` | `hooks/useMoveNavigation.ts` | Keyboard/wheel bindings |
| `useRepertoires` | `hooks/useRepertoires.ts` | Library list + delete |

---

## Adding a new route

1. Create `src/app/your-route/page.tsx`
2. Add `"use client"` if the page uses hooks or browser APIs
3. Add navigation link in `src/components/layout/Navbar.tsx` if user-facing
4. Document the route in `README.md` and `docs/user-guide.md`

---

## Adding repertoire features

Typical flow:

1. Extend types in `lib/repertoires/types.ts` or `lib/pgn/types.ts`
2. Implement logic in `lib/repertoires/` or `lib/pgn/`
3. Add unit tests
4. Wire through hook (`usePgnStudy`, `useRepertoireBuilder`, etc.)
5. Update UI component

---

## localStorage in development

- Data persists across hot reloads
- To reset: DevTools → Application → Local Storage → delete `chess:*` keys
- SSR reads return empty arrays — hooks hydrate on `useEffect`

---

## ESLint

Uses `eslint-config-next` with default Next.js 16 rules. The React Compiler babel plugin is enabled in `package.json`.

Common patterns:

```typescript
// Intentional hydration from localStorage
// eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
setState(readFromStorage());
```

Only suppress lint rules with a comment explaining why.

---

## Dependencies

### Production

| Package | Use |
|---------|-----|
| `next` | Framework |
| `react`, `react-dom` | UI |
| `chess.js` | Chess rules |
| `@lichess-org/chessground` | Board UI |
| `@echecs/pgn`, `@echecs/san` | PGN parsing |

### Notable absence

- No database client
- No authentication library
- No state management library (React state + hooks)

---

## Debugging tips

| Issue | Approach |
|-------|----------|
| Board not updating | Check `ChessBoard` sync effect; verify FEN prop |
| Moves rejected in study | `findChoiceByMove` — check promotion matching |
| Training stuck | Inspect `useTrainingSession` engine state in React DevTools |
| Storage full | Check catalog size in DevTools; 4 MB limit |
| Hydration mismatch | Ensure localStorage reads happen in `useEffect`, not initial render |

---

## Related docs

- [Architecture](./architecture.md) — system design
- [Data & storage](./data-and-storage.md) — localStorage schema
- [Deployment](./deployment.md) — production builds
