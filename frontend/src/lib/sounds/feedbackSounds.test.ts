import { describe, expect, it } from "vitest";

import {
  isCaptureSan,
  isCastleSan,
  resolveMoveSoundType,
} from "./feedbackSounds";

describe("feedbackSounds", () => {
  it("detects captures from SAN", () => {
    expect(isCaptureSan("Nxe4")).toBe(true);
    expect(isCaptureSan("exd5")).toBe(true);
    expect(isCaptureSan("O-O")).toBe(false);
    expect(isCaptureSan("Nf3")).toBe(false);
  });

  it("detects castling from SAN", () => {
    expect(isCastleSan("O-O")).toBe(true);
    expect(isCastleSan("O-O-O")).toBe(true);
    expect(isCastleSan("0-0")).toBe(true);
  });

  it("resolves move sound types with correct priority", () => {
    expect(resolveMoveSoundType({ san: "Qxf7#" })).toBe("checkmate");
    expect(resolveMoveSoundType({ san: "e8=Q" })).toBe("promote");
    expect(resolveMoveSoundType({ san: "exd8=Q" })).toBe("promote");
    expect(resolveMoveSoundType({ san: "O-O" })).toBe("castle");
    expect(resolveMoveSoundType({ san: "O-O-O" })).toBe("castle");
    expect(resolveMoveSoundType({ flags: "k" })).toBe("castle");
    expect(resolveMoveSoundType({ san: "Nxe4" })).toBe("capture");
    expect(resolveMoveSoundType({ san: "Qh5+" })).toBe("move_check");
    expect(resolveMoveSoundType({ san: "Nf3" })).toBe("move");
    expect(
      resolveMoveSoundType({
        san: "Nf3",
        promotion: "q",
      }),
    ).toBe("promote");
  });
});
