import { describe, expect, it } from "vitest";

import type { StudyGame, StudyNode } from "@/lib/pgn/types";

import {
  buildNodePath,
  canNavigateForward,
  getForwardNodeId,
  resolveTipAfterNavigate,
} from "./treeNavigation";

function makeGame(nodes: Record<string, StudyNode>, rootId: string): StudyGame {
  return {
    meta: {},
    result: "*",
    startFen: "start",
    rootId,
    nodes,
  };
}

describe("treeNavigation", () => {
  const game = makeGame(
    {
      root: {
        id: "root",
        san: "",
        fen: "start",
        color: null,
        ply: 0,
        parentId: null,
        childIds: ["e4"],
        pathLabel: "root",
        isVariation: false,
      },
      e4: {
        id: "e4",
        san: "e4",
        fen: "after-e4",
        color: "w",
        ply: 1,
        parentId: "root",
        childIds: ["e5", "c5"],
        pathLabel: "main",
        isVariation: false,
      },
      e5: {
        id: "e5",
        san: "e5",
        fen: "after-e5",
        color: "b",
        ply: 2,
        parentId: "e4",
        childIds: ["nf3"],
        pathLabel: "main",
        isVariation: false,
      },
      c5: {
        id: "c5",
        san: "c5",
        fen: "after-c5",
        color: "b",
        ply: 2,
        parentId: "e4",
        childIds: [],
        pathLabel: "alt",
        isVariation: true,
      },
      nf3: {
        id: "nf3",
        san: "Nf3",
        fen: "after-nf3",
        color: "w",
        ply: 3,
        parentId: "e5",
        childIds: [],
        pathLabel: "main",
        isVariation: false,
      },
    },
    "root",
  );

  it("builds a path from root to a node", () => {
    expect(buildNodePath(game, "nf3").map((node) => node.san)).toEqual([
      "",
      "e4",
      "e5",
      "Nf3",
    ]);
  });

  it("steps forward along the path to the tip", () => {
    expect(getForwardNodeId(game, "e4", "nf3")).toBe("e5");
    expect(getForwardNodeId(game, "e5", "nf3")).toBe("nf3");
    expect(getForwardNodeId(game, "nf3", "nf3")).toBeNull();
  });

  it("keeps the tip when rewinding on the active line", () => {
    expect(resolveTipAfterNavigate(game, "nf3", "e4")).toBe("nf3");
    expect(resolveTipAfterNavigate(game, "nf3", "root")).toBe("nf3");
  });

  it("moves the tip when switching to a different branch", () => {
    expect(resolveTipAfterNavigate(game, "nf3", "c5")).toBe("c5");
  });

  it("reports forward availability only when a later move exists on the tip line", () => {
    expect(canNavigateForward(game, "e4", "nf3")).toBe(true);
    expect(canNavigateForward(game, "c5", "nf3")).toBe(false);
  });
});
