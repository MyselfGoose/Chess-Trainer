import { describe, expect, it } from "vitest";

import {
  buildLegacyTrainingConfig,
  createDefaultTrainingConfig,
  decodeTrainingConfig,
  encodeTrainingConfig,
} from "./config";

describe("training config encode/decode", () => {
  it("round-trips a full config with chapterIds", () => {
    const config = {
      ...createDefaultTrainingConfig("rep-1", "white"),
      lineIds: ["0:leaf-a"],
      chapterIds: ["chapter-1", "chapter-2"],
    };
    const encoded = encodeTrainingConfig(config);
    expect(decodeTrainingConfig(encoded)).toEqual(config);
  });

  it("round-trips a full config", () => {
    const config = {
      ...createDefaultTrainingConfig("rep-1", "white"),
      lineIds: ["0:leaf-a", "0:leaf-b"],
      maxLines: 10,
      anchorLeafNodeId: "node-x",
      showCommentsAfterLine: true,
      soundEnabled: false,
      mode: "learn" as const,
      opponentPolicy: "weighted" as const,
    };

    const encoded = encodeTrainingConfig(config);
    expect(decodeTrainingConfig(encoded)).toEqual(config);
  });

  it("returns null for invalid base64", () => {
    expect(decodeTrainingConfig("not-valid!!!")).toBeNull();
  });

  it("returns null for tampered payload", () => {
    const encoded = encodeTrainingConfig(createDefaultTrainingConfig("rep-1", "white"));
    const tampered = encoded.slice(0, -4) + "XXXX";
    expect(decodeTrainingConfig(tampered)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeTrainingConfig("")).toBeNull();
  });

  it("buildLegacyTrainingConfig sets lineIds", () => {
    const config = buildLegacyTrainingConfig("rep-2", "black", ["0:a", "0:b"]);
    expect(config.lineIds).toEqual(["0:a", "0:b"]);
    expect(config.userColor).toBe("black");
    expect(config.soundEnabled).toBe(true);
    expect(config.opponentPolicy).toBe("mainline");
  });
});
