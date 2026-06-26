"use client";

import type { StudyNode } from "@/lib/pgn";

interface PgnPathBarProps {
  path: StudyNode[];
  currentNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function formatChipLabel(node: StudyNode): string {
  if (node.color === "w" && node.moveNumber) {
    return `${node.moveNumber}.${node.san}`;
  }
  if (node.color === "b" && node.moveNumber) {
    return `${node.moveNumber}...${node.san}`;
  }
  return node.san;
}

export function PgnPathBar({ path, currentNodeId, onSelect }: PgnPathBarProps) {
  const moves = path.filter((node) => node.san !== "");

  if (moves.length === 0) {
    return (
      <div className="w-full min-w-0">
        <p className="mb-1.5 text-xs font-medium text-zinc-500">Current line</p>
        <div className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200">
          <p className="text-sm text-zinc-600">Starting position</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">Current line</p>
        <p className="shrink-0 text-xs text-zinc-400">
          {moves.length} {moves.length === 1 ? "move" : "moves"}
        </p>
      </div>
      <div className="max-h-32 overflow-y-auto overflow-x-hidden rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200">
        <div className="flex flex-wrap gap-1.5">
          {moves.map((node) => {
            const isActive = currentNodeId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node.id)}
                title={node.isVariation ? "Variation move" : "Main line move"}
                className={`max-w-full truncate rounded-md px-2 py-1 font-mono text-xs transition ${
                  isActive
                    ? "bg-green-700 font-semibold text-white"
                    : node.isVariation
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                      : "bg-white text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {formatChipLabel(node)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
