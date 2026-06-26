"use client";

import type { StudyGame } from "@/lib/pgn";

interface PgnGameSelectorProps {
  games: StudyGame[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function PgnGameSelector({
  games,
  selectedIndex,
  onSelect,
}: PgnGameSelectorProps) {
  if (games.length <= 1) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor="pgn-game-select" className="text-xs font-medium text-zinc-500">
        Game ({games.length} total)
      </label>
      <select
        id="pgn-game-select"
        value={selectedIndex}
        onChange={(event) => onSelect(Number(event.target.value))}
        className="w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      >
        {games.map((game, index) => {
          const label = [
            game.meta.Event || `Game ${index + 1}`,
            game.meta.White && game.meta.Black
              ? `${game.meta.White} vs ${game.meta.Black}`
              : null,
          ]
            .filter(Boolean)
            .join(" — ");
          return (
            <option key={index} value={index}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
