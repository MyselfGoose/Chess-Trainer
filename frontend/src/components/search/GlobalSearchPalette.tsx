"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { listRepertoires } from "@/lib/repertoires";
import {
  searchAllRepertoires,
  type GlobalSearchResult,
  type SearchResultType,
} from "@/lib/search";

interface GlobalSearchPaletteProps {
  open: boolean;
  sessionKey: number;
  onClose: () => void;
}

const MATCH_TYPE_LABELS: Record<SearchResultType, string> = {
  line: "Line",
  comment: "Comment",
  position: "Position",
};


function GlobalSearchPalettePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const catalog = useMemo(() => listRepertoires(), []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setHighlightIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const flatResults = useMemo(() => {
    if (debouncedQuery.trim().length === 0) {
      return [];
    }
    return searchAllRepertoires(catalog, debouncedQuery);
  }, [catalog, debouncedQuery]);

  const safeHighlightIndex = Math.min(
    highlightIndex,
    Math.max(0, flatResults.length - 1),
  );

  const indexedFlat = useMemo(
    () => flatResults.map((result, optionIndex) => ({ result, optionIndex })),
    [flatResults],
  );

  const indexedGroups = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ result: GlobalSearchResult; optionIndex: number }>
    >();
    for (const item of indexedFlat) {
      const existing = groups.get(item.result.repertoireName) ?? [];
      existing.push(item);
      groups.set(item.result.repertoireName, existing);
    }
    return [...groups.entries()].map(([repertoireName, results]) => ({
      repertoireName,
      results,
    }));
  }, [indexedFlat]);

  const selectResult = useCallback(
    (result: GlobalSearchResult) => {
      router.push(
        `/study/${result.repertoireId}?game=${result.gameIndex}&node=${result.nodeId}`,
      );
      onClose();
    },
    [onClose, router],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        Math.min(current + 1, Math.max(0, flatResults.length - 1)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && flatResults[safeHighlightIndex]) {
      event.preventDefault();
      selectResult(flatResults[safeHighlightIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-overlay p-4 pt-[12vh]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Search repertoires"
      >
        <div className="border-b border-border p-3">
          <label htmlFor="global-search-input" className="sr-only">
            Search repertoires
          </label>
          <input
            ref={inputRef}
            id="global-search-input"
            type="search"
            role="combobox"
            aria-expanded={flatResults.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              flatResults[safeHighlightIndex]
                ? `global-search-option-${safeHighlightIndex}`
                : undefined
            }
            placeholder="Search moves, comments, or FEN…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Search SAN lines, node comments, and positions. Press Esc to close.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {debouncedQuery.trim().length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Type to search across all repertoires…
            </p>
          ) : null}

          {debouncedQuery.trim().length > 0 && flatResults.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          ) : null}

          {flatResults.length > 0 ? (
            <ul id={listboxId} role="listbox" className="space-y-3">
              {indexedGroups.map((group) => (
                <li key={group.repertoireName}>
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.repertoireName}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {group.results.map(({ result, optionIndex }) => {
                      const isHighlighted = optionIndex === safeHighlightIndex;
                      return (
                        <li
                          key={`${result.repertoireId}-${result.gameIndex}-${result.nodeId}-${result.matchType}`}
                        >
                          <button
                            id={`global-search-option-${optionIndex}`}
                            type="button"
                            role="option"
                            aria-selected={isHighlighted}
                            onMouseEnter={() => setHighlightIndex(optionIndex)}
                            onClick={() => selectResult(result)}
                            className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                              isHighlighted
                                ? "bg-accent-muted text-foreground"
                                : "text-foreground/90 hover:bg-surface-muted"
                            }`}
                          >
                            <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border">
                              {MATCH_TYPE_LABELS[result.matchType]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {result.label}
                              </span>
                              {result.snippet ? (
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  {result.snippet}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GlobalSearchPalette({
  open,
  sessionKey,
  onClose,
}: GlobalSearchPaletteProps) {
  if (!open) {
    return null;
  }

  return <GlobalSearchPalettePanel key={sessionKey} onClose={onClose} />;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

export function useGlobalSearchShortcut(onOpen: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      onOpen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onOpen]);
}
