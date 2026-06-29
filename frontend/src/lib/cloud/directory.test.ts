import { describe, expect, it, vi } from "vitest";

import {
  fetchDirectory,
  getDirectoryUrl,
  isRepertoireDirectory,
} from "./directory";

describe("community directory", () => {
  it("validates directory shape", () => {
    const sample = {
      version: 1,
      updatedAt: "2026-01-01",
      entries: [
        {
          id: "a",
          name: "A",
          author: "Author",
          downloadUrl: "https://example.com/a.pgn",
          tags: ["tag"],
        },
      ],
    };
    expect(isRepertoireDirectory(sample)).toBe(true);
    expect(isRepertoireDirectory({ version: 2 })).toBe(false);
  });

  it("fetchDirectory loads configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_REPERTOIRE_DIRECTORY_URL", "/directory/example-directory.json");
    const sample = {
      version: 1 as const,
      updatedAt: "2026-01-01",
      entries: [
        {
          id: "a",
          name: "A",
          author: "Author",
          downloadUrl: "https://example.com/a.pgn",
          tags: ["tag"],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sample,
      }),
    );
    const directory = await fetchDirectory();
    expect(directory.entries.length).toBeGreaterThan(0);
    expect(getDirectoryUrl()).toBe("/directory/example-directory.json");
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
