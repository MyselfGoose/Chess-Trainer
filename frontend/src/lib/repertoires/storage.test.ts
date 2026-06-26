import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRepertoire,
  deleteRepertoire,
  getRepertoire,
  listRepertoires,
  RepertoireStorageError,
  updateRepertoire,
} from "./storage";
import { REPERTOIRE_CATALOG_KEY } from "./types";
import { createEmptyStudyGame } from "./treeBuilder";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-1",
  });
});

describe("repertoire storage", () => {
  it("creates and lists repertoires", () => {
    const game = createEmptyStudyGame("Test");
    const repertoire = createRepertoire({
      name: "Sicilian",
      source: "created",
      games: [game],
      registeredLeafIds: [],
    });

    expect(repertoire.id).toBe("test-uuid-1");
    expect(listRepertoires()).toHaveLength(1);
    expect(getRepertoire(repertoire.id)?.name).toBe("Sicilian");
  });

  it("updates a repertoire", () => {
    const game = createEmptyStudyGame("Test");
    const repertoire = createRepertoire({
      name: "Old name",
      source: "created",
      games: [game],
    });

    const updated = updateRepertoire(repertoire.id, { name: "New name" });
    expect(updated?.name).toBe("New name");
    expect(getRepertoire(repertoire.id)?.name).toBe("New name");
  });

  it("deletes a repertoire", () => {
    const game = createEmptyStudyGame("Test");
    const repertoire = createRepertoire({
      name: "To delete",
      source: "created",
      games: [game],
    });

    expect(deleteRepertoire(repertoire.id)).toBe(true);
    expect(getRepertoire(repertoire.id)).toBeNull();
  });

  it("recovers from corrupt catalog JSON", () => {
    localStorageMock.setItem(REPERTOIRE_CATALOG_KEY, "not-json");
    expect(listRepertoires()).toEqual([]);
  });

  it("rejects saves that exceed quota", () => {
    const game = createEmptyStudyGame("Test");
    const hugeName = "x".repeat(4 * 1024 * 1024 - 200);
    localStorageMock.setItem(
      REPERTOIRE_CATALOG_KEY,
      JSON.stringify([
        {
          id: "existing",
          name: hugeName,
          source: "created",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          games: [game],
          registeredLeafIds: [],
        },
      ]),
    );

    expect(() =>
      createRepertoire({
        name: "Too big",
        source: "created",
        games: [game],
      }),
    ).toThrow(RepertoireStorageError);
  });
});
