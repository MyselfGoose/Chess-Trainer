import { describe, expect, it } from "vitest";

import { toggleOrientation } from "./orientationPreference";

describe("orientationPreference", () => {
  it("toggles between white and black", () => {
    expect(toggleOrientation("white")).toBe("black");
    expect(toggleOrientation("black")).toBe("white");
  });
});
