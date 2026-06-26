"use client";

import { formatAnnotations } from "@/lib/pgn";
import type { StudyGame, StudyNode } from "@/lib/pgn";

interface PgnMoveNodeProps {
  node: StudyNode;
  game: StudyGame;
  currentNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function formatMoveLabel(node: StudyNode): string {
  if (node.color === "w" && node.moveNumber) {
    return `${node.moveNumber}. ${node.san}`;
  }
  if (node.color === "b" && node.moveNumber) {
    return `${node.moveNumber}...${node.san}`;
  }
  return node.san;
}

export function PgnMoveNode({
  node,
  game,
  currentNodeId,
  onSelect,
}: PgnMoveNodeProps) {
  const nagText = formatAnnotations(node.annotations);
  const isActive = currentNodeId === node.id;

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`inline rounded px-1 py-0.5 text-sm font-mono transition ${
          isActive
            ? "bg-green-700 font-semibold text-white"
            : "text-zinc-800 hover:bg-green-100"
        }`}
      >
        {formatMoveLabel(node)}
        {nagText ? (
          <span className={isActive ? "text-green-100" : "text-zinc-500"}>
            {" "}
            {nagText}
          </span>
        ) : null}
      </button>
      {node.comment ? (
        <p className="mt-1 pl-1 text-xs leading-relaxed text-zinc-500">
          {node.comment}
        </p>
      ) : null}
      {(node.clock !== undefined || node.eval) && (
        <div className="mt-0.5 flex flex-wrap gap-1 pl-1">
          {node.clock !== undefined ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
              {formatClock(node.clock)}
            </span>
          ) : null}
          {node.eval ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
              {formatEval(node.eval)}
            </span>
          ) : null}
        </div>
      )}
      {node.childIds.length > 0 ? (
        <PgnMoveTree
          game={game}
          parentId={node.id}
          currentNodeId={currentNodeId}
          onSelect={onSelect}
          depth={0}
        />
      ) : null}
    </div>
  );
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatEval(evalData: NonNullable<StudyNode["eval"]>): string {
  if (evalData.type === "mate") {
    return `#${evalData.value}`;
  }
  return evalData.value > 0 ? `+${evalData.value.toFixed(2)}` : evalData.value.toFixed(2);
}

interface PgnMoveTreeProps {
  game: StudyGame;
  parentId: string;
  currentNodeId: string | null;
  onSelect: (nodeId: string) => void;
  depth: number;
}

export function PgnMoveTree({
  game,
  parentId,
  currentNodeId,
  onSelect,
  depth,
}: PgnMoveTreeProps) {
  const parent = game.nodes[parentId];
  if (!parent) {
    return null;
  }

  const mainChildren = parent.childIds.filter(
    (id) => !game.nodes[id]?.isVariation,
  );
  const variationChildren = parent.childIds.filter(
    (id) => game.nodes[id]?.isVariation,
  );

  return (
    <div className={depth > 0 ? "ml-3 border-l border-zinc-200 pl-2" : ""}>
      {mainChildren.length > 0 ? (
        <div className="flex flex-wrap items-start gap-x-1">
          {mainChildren.map((childId) => {
            const child = game.nodes[childId];
            if (!child) {
              return null;
            }
            return (
              <PgnMoveNode
                key={child.id}
                node={child}
                game={game}
                currentNodeId={currentNodeId}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : null}

      {variationChildren.map((childId, index) => {
        const child = game.nodes[childId];
        if (!child) {
          return null;
        }
        return (
          <div
            key={child.id}
            className="mt-2 border-l-2 border-amber-300 pl-2"
          >
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Alt {index + 1}
            </span>
            <PgnMoveNode
              node={child}
              game={game}
              currentNodeId={currentNodeId}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}
