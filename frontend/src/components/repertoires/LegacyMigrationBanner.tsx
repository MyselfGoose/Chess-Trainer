"use client";

import { useCallback, useState } from "react";

import { loadStudy, PGN_STORAGE_KEY } from "@/lib/pgn";
import { createRepertoire } from "@/lib/repertoires";

const DISMISS_KEY = "chess:legacy-migration-dismissed";

interface LegacyMigrationBannerProps {
  onMigrated: () => void;
}

function readLegacyState(): {
  visible: boolean;
  legacyName: string;
} {
  if (typeof window === "undefined") {
    return { visible: false, legacyName: "Imported session" };
  }
  if (sessionStorage.getItem(DISMISS_KEY)) {
    return { visible: false, legacyName: "Imported session" };
  }
  const legacy = loadStudy();
  if (legacy && legacy.games.length > 0) {
    return {
      visible: true,
      legacyName:
        legacy.fileName?.replace(/\.pgn$/i, "") ?? "Imported session",
    };
  }
  return { visible: false, legacyName: "Imported session" };
}

export function LegacyMigrationBanner({ onMigrated }: LegacyMigrationBannerProps) {
  const [state, setState] = useState(readLegacyState);
  const { visible, legacyName } = state;
  const [name, setName] = useState(legacyName);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setState({ visible: false, legacyName: name });
  }, [name]);

  const importLegacy = useCallback(() => {
    const legacy = loadStudy();
    if (!legacy || legacy.games.length === 0) {
      setState({ visible: false, legacyName: name });
      return;
    }
    createRepertoire({
      name: name.trim() || "Imported session",
      source: "imported",
      games: legacy.games,
      fileName: legacy.fileName,
    });
    sessionStorage.removeItem(PGN_STORAGE_KEY);
    sessionStorage.setItem(DISMISS_KEY, "1");
    setState({ visible: false, legacyName: name });
    onMigrated();
  }, [name, onMigrated]);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="text-sm font-medium text-amber-900">
        You have an unsaved study session from the previous version.
      </p>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-amber-800">Save as</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-1.5 text-sm"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={importLegacy}
          className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Add to library
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-3 py-1.5 text-xs text-amber-800"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
