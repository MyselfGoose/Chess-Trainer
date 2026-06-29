import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_REPERTOIRE_META } from "./meta";
import {
  deleteSnapshot,
  listSnapshots,
  loadSnapshot,
  MAX_SNAPSHOTS_PER_REPERTOIRE,
  saveSnapshot,
  SnapshotStorageError,
} from "./snapshots";
import { createEmptyStudyGame } from "./treeBuilder";
import type { Repertoire } from "./types";

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
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
  };
})();

function repertoire(id: string): Repertoire {
  return {
    id,
    name: "Snapshot test",
    source: "imported",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: [createEmptyStudyGame("Main")],
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
  };
}

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("structuredClone", <T>(value: T): T => JSON.parse(JSON.stringify(value)));
});

describe("snapshots", () => {
  it("saves and loads a snapshot", () => {
    const saved = saveSnapshot(repertoire("rep-1"), "Before edits");
    const loaded = loadSnapshot(saved.snapshotId);
    expect(loaded?.label).toBe("Before edits");
    expect(loaded?.repertoire.name).toBe("Snapshot test");
  });

  it("lists snapshots newest first", () => {
    saveSnapshot(repertoire("rep-1"), "First");
    saveSnapshot(repertoire("rep-1"), "Second");
    const summaries = listSnapshots("rep-1");
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.label).toBe("Second");
  });

  it("deletes snapshots", () => {
    const saved = saveSnapshot(repertoire("rep-1"));
    deleteSnapshot(saved.snapshotId);
    expect(loadSnapshot(saved.snapshotId)).toBeNull();
  });

  it("caps snapshots per repertoire", () => {
    for (let index = 0; index < MAX_SNAPSHOTS_PER_REPERTOIRE + 2; index += 1) {
      saveSnapshot(repertoire("rep-1"), `Snap ${index}`);
    }
    expect(listSnapshots("rep-1")).toHaveLength(MAX_SNAPSHOTS_PER_REPERTOIRE);
  });

  it("throws on quota exceeded", () => {
    vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      const error = new DOMException("quota", "QuotaExceededError");
      throw error;
    });
    expect(() => saveSnapshot(repertoire("rep-1"))).toThrow(SnapshotStorageError);
  });
});
