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
                ? "border-green-600 bg-green-50 ring-2 ring-green-200"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              {color === "white" ? "♔" : "♚"}
            </span>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              Play as {color === "white" ? "White" : "Black"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
