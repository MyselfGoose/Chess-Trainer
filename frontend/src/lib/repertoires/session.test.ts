import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearStudySession,
  createDefaultStudySession,
  loadStudySession,
  saveStudySession,
} from "./session";
import { studySessionKey } from "./types";

const sessionStorageMock = (() => {
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

const REPERTOIRE_ID = "rep-1";

beforeEach(() => {
  sessionStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", sessionStorageMock);
});

describe("loadStudySession", () => {
  it("migrates v1 session to v2 with tipNodeId and white orientation", () => {
    sessionStorageMock.setItem(
      studySessionKey(REPERTOIRE_ID),
      JSON.stringify({
        currentNodeId: "node-a",
        selectedGameIndex: 1,
      }),
    );

    const session = loadStudySession(REPERTOIRE_ID);
    expect(session).toEqual({
      version: 2,
      currentNodeId: "node-a",
      selectedGameIndex: 1,
      tipNodeId: "node-a",
      orientation: "white",
    });
  });

  it("loads v2 session as-is", () => {
    const v2 = {
      version: 2 as const,
      currentNodeId: "node-b",
      selectedGameIndex: 0,
      tipNodeId: "node-c",
      orientation: "black" as const,
    };
    sessionStorageMock.setItem(
      studySessionKey(REPERTOIRE_ID),
      JSON.stringify(v2),
    );

    expect(loadStudySession(REPERTOIRE_ID)).toEqual(v2);
  });

  it("returns null for corrupt JSON", () => {
    sessionStorageMock.setItem(studySessionKey(REPERTOIRE_ID), "{invalid");
    expect(loadStudySession(REPERTOIRE_ID)).toBeNull();
  });

  it("returns null for invalid schema", () => {
    sessionStorageMock.setItem(
      studySessionKey(REPERTOIRE_ID),
      JSON.stringify({ foo: "bar" }),
    );
    expect(loadStudySession(REPERTOIRE_ID)).toBeNull();
  });

  it("returns null when session is missing", () => {
    expect(loadStudySession(REPERTOIRE_ID)).toBeNull();
  });
});

describe("saveStudySession", () => {
  it("round-trips v2 session", () => {
    const state = createDefaultStudySession("root", 0);
    state.tipNodeId = "leaf-1";
    state.orientation = "black";

    saveStudySession(REPERTOIRE_ID, state);
    expect(loadStudySession(REPERTOIRE_ID)).toEqual(state);
  });
});

describe("clearStudySession", () => {
  it("removes stored session", () => {
    saveStudySession(REPERTOIRE_ID, createDefaultStudySession("root", 0));
    clearStudySession(REPERTOIRE_ID);
    expect(loadStudySession(REPERTOIRE_ID)).toBeNull();
  });
});
