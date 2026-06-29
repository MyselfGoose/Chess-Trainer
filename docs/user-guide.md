# User guide

Complete reference for every feature in RepertoireLab.

## Table of contents

1. [Navigation](#navigation)
2. [PGN import](#pgn-import)
3. [Repertoire library](#repertoire-library)
4. [Building repertoires](#building-repertoires)
5. [Study mode](#study-mode)
6. [Opening training](#opening-training)
7. [Tournament prep](#tournament-prep)
8. [Free play board](#free-play-board)
9. [Move navigation](#move-navigation)

---

## Navigation

The top navigation bar is available on every page:

| Link | Destination |
|------|-------------|
| **Home** | Landing page with overview and quick actions |
| **Upload** | PGN import |
| **Repertoires** | Library of all saved repertoires |
| **Training** | Training hub and session launcher |
| **Prep** | Tournament prep — opponent profiles and targeted drills |

The free play board is linked from the home page footer (`/board`).

---

## PGN import

**Route:** `/upload`

Import existing opening files instead of building from scratch.

### Supported input methods

- **File upload** — drag-and-drop or file picker (`.pgn` files)
- **Paste** — paste raw PGN text into the text area
- **Lichess studies** — paste a Lichess study URL to see import instructions (you still upload the downloaded PGN)

### Lichess study import

RepertoireLab cannot fetch studies from Lichess directly. To import a Lichess study:

1. Open the study on [lichess.org](https://lichess.org).
2. Use the study menu → **Download PGN**.
3. Upload or paste the downloaded file on `/upload`.

If you paste a Lichess study URL (e.g. `https://lichess.org/study/...`), an instructions panel appears with a link to the study.

### What is preserved

| PGN feature | Supported |
|-------------|-----------|
| Multiple games in one file | Yes |
| Variations (parentheses) | Yes |
| Comments | Yes |
| NAG annotations (`$1`, `$2`, …) | Yes |
| Arrows and square highlights | Yes |
| Custom starting FEN | Yes |
| Clock times and evals | Stored when present |

### Import workflow

1. Provide PGN via file or paste.
2. The parser builds a preview with game count and line statistics.
3. On success, the repertoire is saved to your local library automatically.
4. Actions after import:
   - **Study** — open study mode immediately
   - **View repertoires** — go to the library

### Limits

| Limit | Value |
|-------|-------|
| Maximum PGN file size | 2 MB |
| Repertoire name length | 80 characters |

Names default to the filename (without `.pgn`) or the PGN `Event` header.

### Imported vs created repertoires

Imported repertoires are tagged `source: imported`. **All leaf lines** in the variation tree are available for training.

Imported repertoires are read-only in the builder. Use **Duplicate & Edit** (on the repertoire card or study page) to create an editable **Created** copy. The original imported file is not modified.

---

## Repertoire library

**Route:** `/repertoires`

Your local library lists every saved repertoire, sorted by most recently updated.

### Repertoire card

Each card shows:

- Repertoire name and source badge (Imported / Created)
- Number of games and registered lines
- Line statistics (depth, branches, total moves)
- Training stats when available (last trained, pass rate)

### Actions

| Action | Description |
|--------|-------------|
| **Study** | Open interactive study mode |
| **Dashboard** | Open training analytics for this repertoire |
| **Train** | Open training setup for this repertoire |
| **Edit** | Open the builder (created repertoires only) |
| **Duplicate & Edit** | Fork an imported repertoire into an editable copy (imported only) |
| **Export PGN** | Download the full repertoire as a PGN file (one-click from the card) |
| **Delete** | Remove from local storage (irreversible) |

### Duplicate & Edit (imported repertoires)

Creates a new **Created** repertoire from an imported PGN:

1. Click **Duplicate & Edit** on the card or study header.
2. Choose a name (default: `"{name} (editable)"`).
3. Choose **Register lines**: **All leaves** (train every line immediately) or **None** (register manually in the builder).
4. You are taken to the builder for the new copy.

The original imported repertoire is unchanged. The copy records `forkedFromId` in metadata for traceability.

### Creating a new repertoire

Click **New repertoire** to open the builder at `/repertoires/new`.

### Repertoire detail (chapters & tags)

**Route:** `/repertoires/[id]` — click a repertoire name on the library card.

- **Tags** — add labels at the repertoire level (e.g. `prep`, `sicilian`).
- **Chapters** — group trainable lines into named chapters.
- **Auto-suggest** — groups lines by the first two full moves (four plies) and creates chapter names like `e4 c5 / Nf3 d6`.
- Assign lines to chapters via checkboxes when editing a chapter.
- Reorder chapters with Up/Down; delete removes the chapter only (lines stay in the repertoire).

In **study mode**, chapter badges appear at line endings; click a badge to train that chapter, or use **Manage chapters** to edit.

Use **Export PGN** in the study header to download with scope options (current game, full repertoire, or chapter). Chapter export includes full games that contain chapter lines.

Below the path bar, an **opening badge** shows the ECO code and name when recognized (e.g. `C50 — Italian Game`). The starting position shows no badge.

In **training setup**, check one or more chapters to limit the session to those lines. Leave all unchecked to train every line for your color. The `?chapter=` URL parameter pre-selects a chapter (from study badges).

### Repertoire dashboard

**Route:** `/repertoires/[id]/dashboard` — click **Dashboard** on a repertoire card.

Analytics overview before you study or train:

| Widget | What it shows |
|--------|----------------|
| **Summary cards** | Total lines, training coverage %, **readiness** %, last studied date, weak line count |
| **Lines by opening** | ECO bar chart — how many lines fall under each opening |
| **Depth histogram** | Line counts by ply depth (1–4, 5–8, 9–12, 13+) |
| **Weak lines** | Lines with pass rate below 50% after 2+ attempts; links to filtered training |
| **Chapter breakdown** | Lines, trained count, and weak count per chapter (plus unassigned lines) |
| **Coverage map** | Color grid of mastery level per line |
| **Engine blunder check** | Optional scan for large eval drops; report links back to study positions |
| **Repertoire compare** | Save snapshots and diff against a snapshot, fork parent, or another repertoire |

Coverage % counts lines where mastery level is beyond **new** (you have started training them).

**Readiness** % weights each line by mastery quality: mastered lines count fully, strong review lines (pass rate above 70%) count 80%, learning and weaker review lines count 40%, and new lines count 0%. Coverage can be high while readiness is still low if you have started lines but not mastered them.

**Repertoire compare**: click **Save snapshot** to capture the repertoire at a point in time (up to 5 snapshots per repertoire). Click **Compare** to diff the live repertoire against a saved snapshot, the fork parent (`forkedFromId`), or another repertoire. Results list added/removed lines, changed comments, and SAN path divergences. Snapshots do not change the live repertoire.

**Engine blunder check** (optional, off by default): click **Scan repertoire** to run a client-side Stockfish pass over your tree. Positions where the eval drops more than 200cp after a repertoire move are flagged — advisory only, with copy to verify with your coach. Results link to study mode; training is never blocked. Large repertoires (500+ nodes) ask for confirmation before scanning.

### Global search

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux), or click the search icon in the navbar.

Search across **all repertoires** at once:

- **Move sequences** — e.g. `Nf3`, `1. e4 c5`
- **Comments** — text from builder position notes
- **Positions** — paste a FEN to find matching nodes

Results are grouped by repertoire. Select a result to open **study mode** at that exact position.

### Merge repertoires

On `/repertoires`, click **Merge repertoires**:

1. Pick primary (A) and secondary (B) repertoires.
2. Name the merged result (default: `A + B`).
3. Optionally include B's registered lines (created repertoires only).
4. Confirm — a new **Created** repertoire contains all games from both sources.
5. Optionally delete A and B after merge (off by default).

Event headers are deduplicated when both repertoires use the same game title.

---

## Building repertoires

**Routes:** `/repertoires/new`, `/repertoires/[id]/edit`

Build lines interactively on the chess board.

### Workflow

1. **Name** your repertoire in the header input.
2. **Play moves** by clicking or dragging pieces. All legal chess moves are accepted.
3. **Register** a line when you reach a position you want to keep — the line must be at a leaf (no further moves played from that node).
4. **Branch** by navigating back to an earlier move and playing an alternative.
5. **Save** when you have at least one registered line.

### Registering lines

The **Register line** button is enabled when:

- You are not at the starting position
- The current node is a leaf (end of a line)
- The line is not already registered

Registered lines appear in the side panel list. Click a line to jump to its final position. Use **Remove** to unregister a line.

### Bulk register

**Bulk register** registers every leaf line at depth ≤ N plies in one step:

1. Click **Bulk register** in the builder sidebar.
2. Set the max ply depth (preview shows how many lines will be added).
3. Confirm — already-registered lines are skipped.

### Set position (custom FEN)

Use **Set position** in the builder header to start from a middlegame or study position instead of move 1:

1. Paste a valid FEN string.
2. If the tree already has moves, confirm the destructive reset.
3. Play and register lines from the new starting position — study and training respect `startFen`.

### Copy line between repertoires

Graft a line from another repertoire onto a matching position:

- **Builder:** **Import line** — attach at the current board position.
- **Repertoire detail** (`/repertoires/[id]`): **Copy line** — pick source line and target attach position.

The attach FEN must match the start of the source line; mismatches are blocked. Grafted lines are not auto-registered — register them manually or use bulk register.

### Undo move

**Undo move** deletes the last move from the tree if:

- The current node is a leaf
- The line is not registered
- No registered line passes through the node being removed

Undo is destructive — it removes the node from the tree. For non-destructive review, use [move navigation](./keyboard-shortcuts.md) instead.

### Delete branch & collapse empty

- **Delete from here** removes the current node and all moves below it. A confirmation shows how many positions and registered lines will be removed. The root position cannot be deleted.
- **Collapse empty** removes leaf nodes that have no comments or annotations (dead-end branches).

Use **Undo edit** (Ctrl+Z / Cmd+Z) to restore the tree after delete or collapse. **Redo** is Ctrl+Shift+Z / Cmd+Shift+Z.

### Position notes & arrows

In the builder sidebar:

- **Position notes** — text comments for the current node. Comments auto-save after you pause typing (~500 ms).
- Draw arrows and square highlights on the board, then click **Save arrows to position** to persist them on the node. Drawings are also saved automatically when you navigate to another move.
- Saved comments and arrows export with the repertoire PGN and appear in study mode.

### Undo edit vs undo move

| Control | Scope |
|---------|--------|
| **Undo move** | Removes the last leaf move only (same rules as before) |
| **Undo edit** (Ctrl+Z) | Reverts structural edits: new moves, deletes, comments, saved arrows (up to 20 steps) |

### Variations

When you play a second move from a position that already has a child, the new move is stored as a **variation** (`isVariation: true`). The tree preserves all branches.

### Created repertoire training rules

Only **registered leaf lines** are included in training. Unregistered branches are useful for exploration but won't appear in drills.

---

## Study mode

**Route:** `/study/[id]`

Walk your repertoire on an interactive board with repertoire-constrained moves.

### Layout

| Area | Content |
|------|---------|
| **Board** | Current position; only repertoire moves are draggable |
| **Game selector** | Switch between games in multi-game repertoires |
| **Game info & stats** | PGN headers and line statistics |
| **Path bar** | Breadcrumb of moves from root to current position |
| **Opening badge** | ECO code and opening name when recognized (e.g. `C50 — Italian Game`) |
| **Engine panel** | Optional Stockfish analysis (toggle on; eval bar, best move, depth) |
| **Move choices** | Next repertoire moves with main-line / variation labels |
| **Back one move** | Step to parent position |

### How moves work

- If exactly one repertoire move is available, you can drag the piece or click the choice.
- If multiple moves are available, each is listed with line-count metadata.
- Promotion moves open a piece-selection dialog.
- Illegal or non-repertoire moves are rejected.

### Session persistence

Your current node and selected game index are saved per repertoire. Returning to study mode resumes where you left off.

### Flip board

Use **Flip** to change orientation (White or Black below). Orientation is per-session and not persisted.

### Export PGN

Use **Export PGN** in the study header to download PGN with scope options:

| Scope | Contents |
|-------|----------|
| **Current game** | Only the game you are studying (default when multiple games exist) |
| **Full repertoire** | All games in the repertoire |
| **Chapter** | Full games that contain lines assigned to the selected chapter |

Chapter export includes complete game trees for those games (shared prefixes and variations outside the chapter may appear).

### Opening names

Below the path bar, an opening badge shows the ECO code and name when the current position matches the bundled opening database. Navigate to a different branch and the badge updates. Opening data is loaded on demand and cached after the first lookup.

### Engine analysis

Stockfish runs **client-side** in a Web Worker when you enable analysis. It does not replace repertoire moves — it is advisory only.

| Control | Behavior |
|---------|----------|
| **Analyze** toggle (right sidebar on desktop) | Off by default; turn on to analyze the current position |
| **Engine** button (mobile header) | Opens a drawer with the same engine panel |
| **Eval bar** | White advantage to the right; updates as depth increases |
| **Best / Depth** | Engine best move and search depth (desktop default 18, mobile default 14) |

Analysis **stops and restarts** when you navigate to a new position. If the engine fails to load, study mode continues to work normally.

Disclaimer shown in the panel: engine suggestions may differ from your repertoire preparation.

### Compare moves

At a **branching point** (two or more repertoire continuations), click **Compare moves** above the move list.

| Behavior | Detail |
|----------|--------|
| **When shown** | Only when 2+ move choices exist at the current position |
| **What it does** | Stockfish analyzes up to 3 alternatives (depth 16) |
| **Badges** | Each choice shows engine eval and delta from the best alternative |
| **Labeling** | "Engine suggestion" — not a judgment that repertoire moves are wrong |

Compare is user-initiated only. Navigating away cancels an in-progress comparison. Running compare stops any active engine-panel analysis (and vice versa).

### Duplicate & Edit

Imported repertoires show **Duplicate & Edit** in the study header — same flow as on the repertoire card.

---

## Opening training

**Routes:** `/training`, `/training/[id]`, `/training/[id]/session`

Drill your repertoire lines against an auto-playing opponent.

### Training hub

Lists all repertoires with:

- Total trainable lines
- Lines per color (White / Black)
- Last trained date and pass rate

### Setup

1. Select a repertoire.
2. Choose your color (**White** or **Black**).
3. Review the line count for your color.
4. Click **Start training**.

### Session flow

```
Start → Random line order → Play your moves → Opponent auto-replies
                              ↓ wrong move
                         Line failed → Next line
                              ↓ line complete
                         Line passed → Next line
                              ↓ all lines done
                         Session summary
```

| Phase | What happens |
|-------|----------------|
| **Active** | You play when it's your color; opponent moves auto-play after ~350 ms |
| **Line feedback** | Brief pass/fail message before the next line |
| **Summary** | Full results with pass/fail counts |

### Opponent behavior

The opponent always plays the correct repertoire move for their side. There is no engine — moves follow the stored tree exactly.

### Wrong moves

If you play a move that is not in the repertoire (or play the wrong repertoire move when multiple exist), the line **fails**. The expected move is shown in feedback.

### Ending early

**End training** (distinct from **Quit**) finishes the session immediately and shows a summary with:

- Lines attempted vs total planned
- **Not attempted** section for skipped lines
- Option to **Train skipped lines** or **Train failed lines**

### Training history

Session summaries are stored locally (last 50 sessions). Stats on repertoire cards are derived from this history.

### Line selection rules

| Repertoire type | Trainable lines |
|-----------------|-----------------|
| Imported | Every leaf in the variation tree |
| Created | Only `registeredLeafIds` |

Lines are filtered by your chosen color — only lines where you have moves to play are included.

Prep sessions can pre-select lines via the `?lines=` URL parameter (comma-separated line IDs). A banner shows how many lines were preselected.

---

## Tournament prep

**Route:** `/prep`

Prepare for a specific opponent by drilling only the lines that match their likely openings.

### Opponent profiles

Create a profile with:

- **Name** and optional **match date**
- **Notes** (free text)
- **Likely openings** — one or more rows, each linking a repertoire with optional **chapter** and/or **ECO** filter

Profiles are stored locally (`chess:opponent-profiles`).

### Line resolution

For each likely opening, lines are resolved in priority order:

1. **Chapter** — if set, only lines assigned to that chapter
2. **ECO code** — if set (and no chapter), lines whose opening prefix matches that ECO
3. **Full repertoire** — all trainable lines in the linked repertoire

Line IDs are deduplicated across openings and grouped by repertoire.

### Prep plan

Click **Generate prep plan** on an opponent card to see:

- Groups per repertoire with line count
- **Readiness** % per group (same formula as the dashboard)
- **Train** link — opens training setup with those lines pre-checked (`?lines=...&color=white`)

---

## Free play board

**Route:** `/board`

A standard chess board with no repertoire constraints.

- Play legal moves for both sides
- Detects check, checkmate, stalemate, and draws
- **New Game** resets to the starting position
- Full [move navigation](./keyboard-shortcuts.md) with arrow keys and scroll wheel

Free play is independent of your repertoire library.

---

## Move navigation

RepertoireLab supports chess-platform-style move stepping in study mode, the repertoire builder, and free play.

| Input | Action |
|-------|--------|
| `←` | Back one move |
| `→` | Forward one move |
| `↑` | Jump to start |
| `↓` | Jump to latest position on the active line |
| Scroll up (on board) | Back one move |
| Scroll down (on board) | Forward one move |

Training sessions do **not** support move navigation — you are playing live drills.

See [Keyboard shortcuts](./keyboard-shortcuts.md) for edge cases and behavior details.

---

## Tips for effective preparation

1. **Import first, refine in the builder** — import a large PGN, study to find gaps, then edit (for created copies) or maintain separate files.
2. **Register deliberately** — for created repertoires, only register lines you actually want to memorize.
3. **Train both colors** — even narrow repertoires often have lines where you need to know opponent responses.
4. **Use failed-line retries** — the summary screen lets you drill only what you missed.
5. **Navigate with arrows** — step back to branch points instead of rebuilding lines from scratch.
