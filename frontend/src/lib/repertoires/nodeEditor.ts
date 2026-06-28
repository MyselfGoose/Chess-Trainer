import type { Arrow, SquareAnnotation } from "@echecs/pgn";

import type { StudyGame } from "@/lib/pgn";

function getNode(game: StudyGame, id: string) {
  return game.nodes[id];
}

export function updateNodeComment(
  game: StudyGame,
  nodeId: string,
  comment: string | undefined,
): StudyGame {
  const node = getNode(game, nodeId);
  if (!node) {
    return game;
  }
  const trimmed = comment?.trim();
  const nextComment = trimmed ? trimmed : undefined;
  return {
    ...game,
    nodes: {
      ...game.nodes,
      [nodeId]: {
        ...node,
        comment: nextComment,
      },
    },
  };
}

export function updateNodeAnnotations(
  game: StudyGame,
  nodeId: string,
  arrows: Arrow[] | undefined,
  squares: SquareAnnotation[] | undefined,
): StudyGame {
  const node = getNode(game, nodeId);
  if (!node) {
    return game;
  }
  return {
    ...game,
    nodes: {
      ...game.nodes,
      [nodeId]: {
        ...node,
        arrows: arrows && arrows.length > 0 ? arrows : undefined,
        squares: squares && squares.length > 0 ? squares : undefined,
      },
    },
  };
}

export function removeRegisteredLeaves(
  registeredLeafIds: string[],
  deletedNodeIds: string[],
): string[] {
  const deleted = new Set(deletedNodeIds);
  return registeredLeafIds.filter((id) => !deleted.has(id));
}
