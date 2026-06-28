import { describe, expect, it } from "vitest";

import {
  loadOrientationPreferenceOrDefault,
  toggleOrientation,
  trainingOrientationKey,
} from "./orientationPreference";

describe("orientationPreference", () => {
  it("toggles between white and black", () => {
    expect(toggleOrientation("white")).toBe("black");
    expect(toggleOrientation("black")).toBe("white");
  });

  it("uses per-color training orientation keys with color default", () => {
    expect(trainingOrientationKey("black")).toBe(
      "chess:training-orientation:black",
    );
    expect(
      loadOrientationPreferenceOrDefault(
        trainingOrientationKey("black"),
        "black",
      ),
    ).toBe("black");
  });
});
