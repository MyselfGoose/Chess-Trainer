# Getting started

This guide walks you through installing RepertoireLab and completing your first repertoire workflow in under ten minutes.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20 or later |
| npm | 9 or later (bundled with Node) |
| Modern browser | Chrome, Firefox, Safari, or Edge (latest) |

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd chess/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser. You should see the RepertoireLab landing page with links to create or import a repertoire.

### Verify the install

```bash
npm test        # Unit tests (should all pass)
npm run lint    # ESLint
npm run build   # Production build
```

## Path A: Import a PGN file

Best if you already have opening files from ChessBase, Lichess, or another tool.

1. Click **Upload** in the navigation bar (or **Import a PGN** on the home page).
2. Drag and drop a `.pgn` file onto the upload area, or click to browse.
   - Alternatively, expand **Paste PGN text** and paste the file contents directly.
3. Review the parse preview — game count, line statistics, and any warnings.
4. The repertoire is saved automatically with a name derived from the filename or PGN `Event` header.
5. Click **Study** to open interactive study mode for that repertoire.

**What you get:** A full variation tree with all leaf lines available for training.

## Path B: Build a repertoire from scratch

Best if you want to construct lines move-by-move and explicitly choose which lines to keep.

1. Click **Repertoires** → **Create a repertoire** (or **Create a repertoire** on the home page).
2. Enter a name in the header field.
3. Play moves on the board — legal chess moves are accepted.
4. When you reach the end of a line you want to keep, click **Register line**.
5. To add a variation, use the move navigation controls to go back to an earlier position and play a different move (see [Keyboard shortcuts](./keyboard-shortcuts.md)).
6. Register each complete line you want in your repertoire.
7. Click **Save repertoire** when at least one line is registered.

**What you get:** A repertoire where only registered lines appear in training.

## Study your repertoire

1. Open a repertoire from **Repertoires** and click **Study**, or go directly to `/study/[id]`.
2. The board shows the current position. The side panel shows:
   - Game selector (if the repertoire has multiple games)
   - Path bar (breadcrumb of moves along the current line)
   - Available next moves in your repertoire
3. Click a move choice or drag a piece — only repertoire moves are allowed.
4. Use **Back one move** or arrow keys to rewind and explore branches.

Study mode remembers your position per repertoire (stored in `localStorage`).

## Run your first training session

1. Click **Training** in the navigation bar.
2. Select a repertoire from the list (shows line counts and last-trained stats).
3. Choose **White** or **Black** — you will play that color; the opponent auto-plays the other side.
4. Click **Start training**.
5. Play your moves when it is your turn. Wrong moves fail the line; correct play advances automatically.
6. Review the session summary when all lines are complete (or use **End training** to finish early).

From the summary you can **Train failed lines** or **Train skipped lines** to focus on weak spots.

## Free play

Just want a casual game? Open **/board** from the home page footer link. This is a standard chess board with no repertoire constraints. Arrow-key navigation works here too.

## Next steps

| Goal | Read |
|------|------|
| Understand every feature in depth | [User guide](./user-guide.md) |
| Learn move navigation shortcuts | [Keyboard shortcuts](./keyboard-shortcuts.md) |
| Understand where data is stored | [Data & storage](./data-and-storage.md) |
| Contribute or extend the app | [Development](./development.md) |

## Troubleshooting

### Repertoire won't save

The local library has a **4 MB** total size limit. Delete unused repertoires or export them as PGN before adding more. See [Data & storage](./data-and-storage.md).

### PGN import shows errors

- Ensure the file is valid PGN (UTF-8 text).
- Maximum upload size is **2 MB** per file.
- Some exotic PGN constructs may produce warnings but still import partially — check the parse preview.

### Study position reset unexpectedly

Study sessions are per-browser. Private/incognito windows, clearing site data, or a different browser will not share session state.

### Training has no lines

- **Imported** repertoires need at least one complete line (a leaf node) in the tree.
- **Created** repertoires need at least one **registered** line before training is available.
