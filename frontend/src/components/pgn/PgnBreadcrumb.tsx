import type { StudyNode } from "@/lib/pgn";

interface PgnBreadcrumbProps {
  path: StudyNode[];
}

export function PgnBreadcrumb({ path }: PgnBreadcrumbProps) {
  const moves = path.filter((node) => node.san !== "");
  if (moves.length === 0) {
    return (
      <p className="text-xs text-zinc-500">Starting position</p>
    );
  }

  return (
    <p className="truncate text-xs text-zinc-600">
      {moves.map((node, index) => {
        const prefix =
          node.color === "w" && node.moveNumber
            ? `${node.moveNumber}.`
            : node.color === "b" && node.moveNumber
              ? `${node.moveNumber}...`
              : "";
        return (
          <span key={node.id}>
            {index > 0 ? " → " : ""}
            {prefix}
            {node.san}
            {node.isVariation ? " (var)" : ""}
          </span>
        );
      })}
    </p>
  );
}
