import { describe, expect, it } from "vitest";

import { parsePackManifest, previewPackStats } from "./starterPacks";

const SAMPLE_MANIFEST = {
  packs: [
    {
      id: "test",
      fileName: "test.pgn",
      name: "Test",
      description: "Test pack",
      color: "white",
      tags: ["test"],
    },
  ],
};

const SAMPLE_PGN = `[Event "T"]
1. e4 e5 2. Nf3 *
`;

describe("starterPacks", () => {
  it("parses valid manifest", () => {
    expect(parsePackManifest(SAMPLE_MANIFEST)?.packs).toHaveLength(1);
  });

  it("rejects invalid manifest", () => {
    expect(parsePackManifest({ packs: [] })).toBeNull();
    expect(parsePackManifest(null)).toBeNull();
  });

  it("previews pack stats from PGN", () => {
    const stats = previewPackStats(SAMPLE_PGN);
    expect(stats.lineCount).toBeGreaterThan(0);
    expect(stats.maxDepth).toBeGreaterThan(0);
  });
});
