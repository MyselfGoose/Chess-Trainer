import type { BoardColor, PromotionPiece } from "@/lib/chess/types";

interface PromotionDialogProps {
  color: BoardColor;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

const PROMOTION_OPTIONS: Array<{
  piece: PromotionPiece;
  label: string;
  file: string;
}> = [
  { piece: "q", label: "Queen", file: "Q" },
  { piece: "r", label: "Rook", file: "R" },
  { piece: "b", label: "Bishop", file: "B" },
  { piece: "n", label: "Knight", file: "N" },
];

export function PromotionDialog({
  color,
  onSelect,
  onCancel,
}: PromotionDialogProps) {
  const prefix = color === "white" ? "w" : "b";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
    >
      <div className="rounded-lg bg-surface p-4 shadow-xl">
        <p className="mb-3 text-center text-sm font-medium text-foreground">
          Promote pawn to:
        </p>
        <div className="flex gap-2">
          {PROMOTION_OPTIONS.map(({ piece, label, file }) => (
            <button
              key={piece}
              type="button"
              onClick={() => onSelect(piece)}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-md border border-border bg-background transition hover:border-accent hover:bg-accent-muted"
              aria-label={`Promote to ${label}`}
            >
              <span
                className="h-10 w-10 bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(/pieces/cburnett/${prefix}${file}.svg)`,
                }}
                aria-hidden="true"
              />
              <span className="mt-1 text-xs text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
