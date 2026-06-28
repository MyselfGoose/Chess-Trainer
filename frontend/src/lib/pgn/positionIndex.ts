import { fenKey, isValidFen } from "@/lib/chess/fen";
import type { Repertoire } from "@/lib/repertoires/types";

export interface PositionEntry {
  fenKey: string;
  nodeIds: Array<{ gameIndex: number; nodeId: string }>;
}

export function buildPositionIndex(
  repertoire: Repertoire,
): Map<string, PositionEntry[]> {
  const nodeIdMap = new Map<
    string,
    Array<{ gameIndex: number; nodeId: string }>
  >();

  repertoire.games.forEach((game, gameIndex) => {
    for (const node of Object.values(game.nodes)) {
      if (!node.fen) {
        continue;
      }
      const key = fenKey(node.fen);
      const refs = nodeIdMap.get(key) ?? [];
      const exists = refs.some(
        (ref) => ref.gameIndex === gameIndex && ref.nodeId === node.id,
      );
      if (!exists) {
        refs.push({ gameIndex, nodeId: node.id });
        nodeIdMap.set(key, refs);
      }
    }
  });

  const index = new Map<string, PositionEntry[]>();
  for (const [key, nodeIds] of nodeIdMap) {
    index.set(key, [{ fenKey: key, nodeIds }]);
  }
  return index;
}

export function findNodesByFen(
  repertoire: Repertoire,
  fen: string,
): PositionEntry[] {
  if (!isValidFen(fen)) {
    return [];
  }
  const key = fenKey(fen);
  const index = buildPositionIndex(repertoire);
  return index.get(key) ?? [];
}
