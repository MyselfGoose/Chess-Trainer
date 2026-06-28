"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { StudyGame } from "@/lib/pgn";
import { indexLines, searchLines } from "@/lib/pgn/lineSearch";

interface PgnLineSearchProps {
  game: StudyGame;
  onSelect: (leafNodeId: string) => void;
}

export function PgnLineSearch({ game, onSelect }: PgnLineSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const lineIndex = useMemo(() => indexLines(game), [game]);
  const results = useMemo(
    () => searchLines(lineIndex, debouncedQuery),
    [debouncedQuery, lineIndex],
  );
  const safeHighlightIndex = Math.min(
    highlightIndex,
    Math.max(0, results.length - 1),
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const selectResult = useCallback(
    (leafNodeId: string) => {
      onSelect(leafNodeId);
      setQuery("");
      setDebouncedQuery("");
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        Math.min(current + 1, Math.max(0, results.length - 1)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && results[safeHighlightIndex]) {
      event.preventDefault();
      selectResult(results[safeHighlightIndex].leafNodeId);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="line-search" className="sr-only">
        Search lines
      </label>
      <input
        id="line-search"
        type="search"
        role="combobox"
        aria-expanded={isOpen && results.length > 0}
        aria-controls="line-search-results"
        aria-autocomplete="list"
        placeholder="Search lines (e.g. Nf3)…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlightIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      />
      {isOpen && results.length > 0 ? (
        <ul
          id="line-search-results"
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-zinc-200"
        >
          {results.map((result, index) => (
            <li key={result.leafNodeId} role="option" aria-selected={index === safeHighlightIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResult(result.leafNodeId)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === safeHighlightIndex
                    ? "bg-green-50 text-green-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
