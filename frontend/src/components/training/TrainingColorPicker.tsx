"use client";

import type { TrainingColor } from "@/lib/training";

interface TrainingColorPickerProps {
  value: TrainingColor;
  onChange: (color: TrainingColor) => void;
}

export function TrainingColorPicker({
  value,
  onChange,
}: TrainingColorPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["white", "black"] as const).map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`rounded-xl border-2 px-4 py-6 text-center transition ${
              selected
                ? "border-accent bg-accent-muted ring-2 ring-accent/30"
                : "border-border bg-surface hover:border-border-strong"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              {color === "white" ? "♔" : "♚"}
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Play as {color === "white" ? "White" : "Black"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
