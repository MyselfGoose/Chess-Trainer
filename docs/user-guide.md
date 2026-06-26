# User guide

Complete reference for every feature in RepertoireLab.

## Table of contents

1. [Navigation](#navigation)
2. [PGN import](#pgn-import)
3. [Repertoire library](#repertoire-library)
4. [Building repertoires](#building-repertoires)
5. [Study mode](#study-mode)
6. [Opening training](#opening-training)
7. [Free play board](#free-play-board)
8. [Move navigation](#move-navigation)

---

## Navigation

The top navigation bar is available on every page:

| Link | Destination |
|------|-------------|
| **Home** | Landing page with overview and quick actions |
| **Upload** | PGN import |
| **Repertoires** | Library of all saved repertoires |
| **Training** | Training hub and session launcher |

The free play board is linked from the home page footer (`/board`).

---

## PGN import

**Route:** `/upload`

Import existing opening files instead of building from scratch.

### Supported input methods

- **File upload** — drag-and-drop or file picker (`.pgn` files)
- **Paste** — paste raw PGN text into the text area

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
| **Train** | Open training setup for this repertoire |
| **Edit** | Open the builder (created repertoires only) |
| **Delete** | Remove from local storage (irreversible) |

### Creating a new repertoire

Click **New repertoire** to open the builder at `/repertoires/new`.

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

### Undo move

**Undo move** deletes the last move from the tree if:

- The current node is a leaf
- The line is not registered
- No registered line passes through the node being removed

Undo is destructive — it removes the node from the tree. For non-destructive review, use [move navigation](./keyboard-shortcuts.md) instead.

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
