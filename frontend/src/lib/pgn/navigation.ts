import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";

import { countLeavesFrom } from "./stats";
import type { StudyGame, StudyNode } from "./types";

export interface MoveChoice {
  node: StudyNode;
  isMainLine: boolean;
  lineCount: number;
}

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function sanMatchesPromotion(san: string, promotion?: PromotionPiece): boolean {
  if (!promotion) {
    return !san.includes("=");
  }
  const upper = promotion.toUpperCase();
  return san.includes(`=${upper}`);
}

export function getMoveChoices(game: StudyGame, nodeId: string): MoveChoice[] {
  const parent = getNode(game, nodeId);
  if (!parent) {
    return [];
  }

  const choices: MoveChoice[] = parent.childIds
    .map((childId) => getNode(game, childId))
    .filter((node): node is StudyNode => node !== undefined)
    .map((node) => ({
      node,
      isMainLine: !node.isVariation,
      lineCount: countLeavesFrom(game, node.id),
    }));

  choices.sort((a, b) => {
    if (a.isMainLine !== b.isMainLine) {
      return a.isMainLine ? -1 : 1;
    }
    return a.node.ply - b.node.ply;
  });

  return choices;
}

export function findChoiceByMove(
  game: StudyGame,
  parentId: string,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
): StudyNode | null {
  const choices = getMoveChoices(game, parentId);

  const bySquares = choices.filter(
    (choice) => choice.node.from === from && choice.node.to === to,
  );

  if (bySquares.length === 0) {
    return null;
  }

  if (bySquares.length === 1) {
    const only = bySquares[0].node;
    if (sanMatchesPromotion(only.san, promotion)) {
      return only;
    }
    return null;
  }

  if (promotion) {
    const matched = bySquares.find((choice) =>
      sanMatchesPromotion(choice.node.san, promotion),
    );
    return matched?.node ?? null;
  }

  const nonPromotion = bySquares.find(
    (choice) => !choice.node.san.includes("="),
  );
  return nonPromotion?.node ?? bySquares[0]?.node ?? null;
}

export function buildRepertoireDests(
  choices: MoveChoice[],
): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>();

  for (const { node } of choices) {
    if (!node.from || !node.to) {
      continue;
    }
    const from = node.from as Square;
    const to = node.to as Square;
    const existing = dests.get(from) ?? [];
    if (!existing.includes(to)) {
      dests.set(from, [...existing, to]);
    }
  }

  return dests;
}

export function choiceRequiresPromotion(
  game: StudyGame,
  parentId: string,
  from: Square,
  to: Square,
): boolean {
  const choices = getMoveChoices(game, parentId).filter(
    (choice) => choice.node.from === from && choice.node.to === to,
  );
  return choices.some((choice) => choice.node.san.includes("="));
}
