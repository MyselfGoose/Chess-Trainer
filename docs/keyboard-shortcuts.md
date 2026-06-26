# Keyboard shortcuts & move navigation

RepertoireLab supports arrow-key and scroll-wheel navigation for stepping through move chains — the same workflow used on Chess.com, Lichess, and similar platforms.

## Where navigation works

| Context | Route / component | Supported |
|---------|-------------------|-----------|
| Study mode | `/study/[id]` | Yes |
| Repertoire builder | `/repertoires/new`, `/repertoires/[id]/edit` | Yes |
| Free play | `/board` | Yes |
| Training session | `/training/[id]/session` | No (live drill) |

A hint line below the board shows available controls on supported pages.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` Left arrow | Go back one move |
| `→` Right arrow | Go forward one move |
| `↑` Up arrow | Jump to the starting position |
| `↓` Down arrow | Jump to the latest position on the active line |

### Modifier keys

Navigation ignores shortcuts when **Ctrl**, **Meta** (Cmd), or **Alt** are held — so browser and OS shortcuts are not overridden.

### Focus rules

Shortcuts are **disabled** when focus is inside:

- Text inputs (e.g. repertoire name field)
- Textareas (e.g. PGN paste area)
- Select dropdowns
- Content-editable elements

Click the board or press Tab to move focus away from inputs before using arrow keys.

### Promotion dialog

Navigation is disabled while the promotion piece picker is open.

---

## Scroll wheel

Scroll on the **board area** to step through moves:

| Scroll direction | Action |
|------------------|--------|
| Scroll up | Back one move |
| Scroll down | Forward one move |

The wheel listener is attached only to the board container, not the side panel — scrolling the move list or repertoire panel works normally.

A small threshold prevents accidental navigation from tiny scroll movements.

---

## Behavior by mode

### Study mode & repertoire builder (tree navigation)

These modes use a **variation tree**. Navigation tracks two positions:

| Concept | Meaning |
|---------|---------|
| **Current position** | What you see on the board |
| **Tip (latest)** | The deepest position you reached on the active branch |

This enables the standard rewind-and-step-forward workflow:

1. You explore a line to move 15 (tip = 15).
2. Press `←` several times to review from move 10 (current = 10, tip still = 15).
3. Press `→` to walk forward along the same line back to move 15.
4. Press `↓` to jump directly to move 15 from any earlier position.
5. Press `↑` to return to the starting position.

#### Branching

If you navigate back and **play a different move** or **select a different variation**, the tip updates to follow the new branch. The old branch remains in the tree but is no longer the "active line" for forward/down navigation.

If you click an earlier move in the **path bar** on the same line, the tip is preserved so `↓` still returns to your deepest explored point.

### Free play (linear history)

Free play uses a **linear move list** with a cursor:

- `←` / scroll up steps to the previous position in the game
- `→` / scroll down steps to the next position
- `↑` jumps to the starting position
- `↓` jumps to the latest move played

If you step back and **play a new move**, the game branches: moves after your cursor are discarded and the new move becomes the latest line (standard chess app behavior).

---

## UI alternatives

Navigation shortcuts complement — not replace — existing controls:

| Control | Equivalent |
|---------|------------|
| **Back one move** button (study panel) | `←` |
| Path bar node click | Jump to that position |
| Move choice click | Forward along a branch |

---

## Implementation reference

For developers:

- Shared hook: `frontend/src/hooks/useMoveNavigation.ts`
- Tree logic: `frontend/src/lib/navigation/treeNavigation.ts`
- Linear history: `frontend/src/lib/navigation/playHistory.ts`
- Bindings component: `frontend/src/components/chess/MoveNavigationBindings.tsx`

See [Architecture](./architecture.md) for how these integrate with study and play hooks.
