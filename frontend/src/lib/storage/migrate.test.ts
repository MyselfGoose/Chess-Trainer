import { beforeEach, describe, expect, it, vi } from "vitest";

import { REPERTOIRE_CATALOG_KEY } from "@/lib/repertoires/types";

import {
  readStorageItem,
  resetStorageForTests,
  setStorageBackend,
  shouldMigrateToIdb,
  writeStorageItem,
  MIGRATION_THRESHOLD_BYTES,
} from "./migrate";

vi.mock("./idb", () => ({
  idbGet: vi.fn(async () => null),
  idbSet: vi.fn(async () => undefined),
  isIndexedDbAvailable: () => true,
}));

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
  resetStorageForTests();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("indexedDB", {});
});

describe("storage migrate", () => {
  it("detects catalog over migration threshold when IndexedDB is available", () => {
    const big = "x".repeat(MIGRATION_THRESHOLD_BYTES + 1);
    localStorageMock.setItem(REPERTOIRE_CATALOG_KEY, big);
    expect(shouldMigrateToIdb()).toBe(true);
  });

  it("skips migration when backend is already idb", () => {
    const big = "x".repeat(MIGRATION_THRESHOLD_BYTES + 1);
    localStorageMock.setItem(REPERTOIRE_CATALOG_KEY, big);
    setStorageBackend("idb");
    expect(shouldMigrateToIdb()).toBe(false);
  });

  it("reads and writes via localStorage backend", () => {
    writeStorageItem("chess:test", "value");
    expect(readStorageItem("chess:test")).toBe("value");
    expect(localStorageMock.getItem("chess:test")).toBe("value");
  });

  it("uses memory cache when backend is idb", () => {
    setStorageBackend("idb");
    writeStorageItem("chess:test", "cached");
    expect(readStorageItem("chess:test")).toBe("cached");
    expect(localStorageMock.getItem("chess:test")).toBeNull();
  });
});
