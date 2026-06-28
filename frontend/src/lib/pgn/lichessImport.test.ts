import { describe, expect, it } from "vitest";

import { detectLichessStudyUrl, isLichessStudyUrl } from "./lichessImport";

describe("lichessImport", () => {
  it("detects a bare study URL", () => {
    const info = detectLichessStudyUrl("https://lichess.org/study/AbCdEfGh");
    expect(info).toEqual({
      studyId: "AbCdEfGh",
      chapterId: undefined,
      url: "https://lichess.org/study/AbCdEfGh",
    });
  });

  it("detects study URL with chapter", () => {
    const info = detectLichessStudyUrl(
      "https://lichess.org/study/AbCdEfGh/chapterXyZ",
    );
    expect(info?.studyId).toBe("AbCdEfGh");
    expect(info?.chapterId).toBe("chapterXyZ");
  });

  it("detects URL without protocol", () => {
    expect(isLichessStudyUrl("lichess.org/study/abc123")).toBe(true);
  });

  it("ignores non-study URLs", () => {
    expect(detectLichessStudyUrl("https://lichess.org/game/123")).toBeNull();
  });
});
