# Data & storage

RepertoireLab persists all user data in the browser. By default this uses **localStorage**; large libraries automatically migrate to **IndexedDB** when the repertoire catalog exceeds 2 MB.

## Overview

| Property | Value |
|----------|-------|
| Primary storage API | `window.localStorage` |
| Large-library backend | `IndexedDB` (`chess-repertoire-lab` database) |
| Migration trigger | Catalog serialized size > 2 MB on app load |
| Scope | Per origin (domain + port) |
| Persistence | Until user clears site data |
| Sync across devices | No |
| Sync across browsers | No |

> **Important:** Clearing browser data for this site deletes all repertoires and training history. Export important repertoires as PGN before clearing storage.

---

## Storage keys

| Key | Purpose |
|-----|---------|
| `chess:repertoire-catalog` | Array of all `Repertoire` objects |
| `chess:study-session:{repertoireId}` | Study mode resume state per repertoire |
| `chess:training-history` | Array of training session summaries |
| `chess:line-mastery` | Spaced-repetition mastery per training line |
| `chess:storage-backend` | `"localStorage"` or `"idb"` — active persistence backend |
| `chess:game-analysis` | Session storage: last played-game deviation analysis |
| `chess:pgn-study` | Legacy single-study storage (migration only) |

### IndexedDB backend

When `chess:storage-backend` is `"idb"`, the catalog, training history, and line mastery are stored in IndexedDB (`chess-repertoire-lab` / `kv` object store) with an in-memory cache for synchronous reads. `chess:storage-backend` itself remains in localStorage.

**Auto-migration:** On first client load after an upgrade, if the catalog exceeds **2 MB** and IndexedDB is available, all `chess:*` data keys are copied to IndexedDB and the backend flag is set. Original localStorage values are kept as backup.

**Implementation:** `frontend/src/lib/storage/migrate.ts`, initialized via `StorageInitializer` in `ClientProviders`.

### Repertoire catalog

**Key:** `chess:repertoire-catalog`

```typescript
// Value: JSON array
Repertoire[]
```

The entire library is stored as a single JSON array. Updates read the full catalog, modify in memory, and write back.

| Constraint | Value |
|------------|-------|
| Maximum catalog size | 4 MB (serialized JSON) |
| Repertoire name max length | 80 characters |

If the catalog exceeds 4 MB, new saves throw `RepertoireStorageError` with a user-facing message to delete or export repertoires.

### Study session

**Key:** `chess:study-session:{repertoireId}`

```typescript
interface StudySessionState {
  currentNodeId: string;
  selectedGameIndex: number;
}
```

Saved when navigating in study mode. Not saved:

- Board orientation (flip)
- Tip node for arrow-key navigation (resets to current node on reload)

### Training history

**Key:** `chess:training-history`

```typescript
// Value: JSON array (newest first)
TrainingSessionSummary[]
```

| Constraint | Value |
|------------|-------|
| Maximum entries | 50 |

Each summary includes:

```typescript
interface TrainingSessionSummary {
  repertoireId: string;
  repertoireName: string;
  userColor: "white" | "black";
  startedAt: string;          // ISO 8601
  finishedAt: string;
  results: TrainingLineResult[];
  endedEarly: boolean;
  totalLinesPlanned: number;
  skippedLines: TrainingSkippedLine[];
}
```

Stats on repertoire cards (pass rate, last trained) are computed from this history at read time.

---

## Repertoire object

```typescript
interface Repertoire {
  id: string;                    // UUID
  name: string;
  source: "imported" | "created";
  createdAt: string;               // ISO 8601
  updatedAt: string;
  fileName?: string;               // Original PGN filename (imports)
  games: StudyGame[];
  registeredLeafIds: string[];     // Node IDs of registered lines
}
```

### Source types

| Source | `registeredLeafIds` | Training lines |
|--------|---------------------|----------------|
| `imported` | Empty (ignored) | All tree leaves |
| `created` | User-registered leaf node IDs | Only registered leaves |

---

## Study tree objects

### StudyGame

```typescript
interface StudyGame {
  meta: Record<string, string>;  // PGN headers
  result: string;                // "1-0", "0-1", "1/2-1/2", "*"
  startFen: string;
  rootId: string;
  nodes: Record<string, StudyNode>;
}
```

### StudyNode

```typescript
interface StudyNode {
  id: string;                    // e.g. "node-42"
  san: string;                   // "" for root
  fen: string;
  color: "w" | "b" | null;
  moveNumber?: number;
  ply: number;
  from?: string;                 // Square, e.g. "e2"
  to?: string;
  parentId: string | null;
  childIds: string[];
  pathLabel: string;
  isVariation: boolean;
  comment?: string;
  annotations?: string[];
  arrows?: Arrow[];
  squares?: SquareAnnotation[];
  clock?: number;
  eval?: Eval;
}
```

Nodes form a **directed tree** (actually a rooted DAG displayed as tree with variation branches). The root node has `san: ""` and `ply: 0`.

---

## PGN import limits

| Limit | Value | Location |
|-------|-------|----------|
| Max PGN upload size | 2 MB | `lib/pgn/types.ts` |
| Max catalog size | 4 MB | `lib/repertoires/types.ts` |

---

## Validation

### Repertoire catalog

On read, each array entry is validated with `isValidRepertoire()`:

- Required string fields (`id`, `name`, `createdAt`, `updatedAt`)
- `source` must be `"imported"` or `"created"`
- `games` and `registeredLeafIds` must be arrays

Invalid entries are silently filtered out.

### Training history

Parsed as `TrainingSessionSummary[]` without strict runtime validation. Malformed entries may cause display issues; clearing `chess:training-history` resets stats.

---

## Export & backup

### Manual backup

Repertoires can be exported as PGN using the export utilities in `lib/pgn/export.ts`:

- `studyGameToPgn(game)` — single game to PGN string
- `repertoireToPgn(repertoire)` — full repertoire
- `downloadPgnFile(content, fileName)` — trigger browser download

> A UI export button may not be exposed on every page yet; developers can use these functions or inspect `localStorage` directly.

### Manual restore

To restore from backup:

1. Import the PGN file via `/upload`, or
2. Paste the `chess:repertoire-catalog` JSON value into DevTools → Application → Local Storage (advanced)

---

## Browser DevTools inspection

1. Open DevTools (F12)
2. Go to **Application** → **Local Storage** → your site's origin
3. Keys prefixed with `chess:` hold RepertoireLab data

### Clear all RepertoireLab data

Delete all keys starting with `chess:` or use **Clear site data** for the origin.

---

## Privacy implications

- Data never leaves the browser unless you deploy telemetry or a backend separately.
- Shared computers: another user on the same browser profile can see your repertoires.
- Incognito/private windows have isolated storage cleared when the window closes.

---

## Related docs

- [Architecture](./architecture.md) — how storage integrates with hooks
- [User guide](./user-guide.md) — feature behavior
- [Deployment](./deployment.md) — storage on hosted deployments (still client-side)
