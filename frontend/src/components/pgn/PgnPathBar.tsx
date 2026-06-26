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
      <div className="rounded-md bg-zinc-100 px-3 py-2">
        <p className="text-xs font-medium text-zinc-500">Starting position</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md bg-zinc-100 px-2 py-2">
      <div className="flex min-w-max items-center gap-1">
        {moves.map((node, index) => {
          const isActive = currentNodeId === node.id;
          return (
            <div key={node.id} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="text-zinc-400" aria-hidden>
                  →
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={`rounded px-2 py-1 font-mono text-xs transition ${
                  isActive
                    ? "bg-green-700 font-semibold text-white"
                    : node.isVariation
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                      : "bg-white text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                {formatChipLabel(node)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
