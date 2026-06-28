"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  compareMoves,
  type CompareAlternative,
  type CompareMoveResult,
} from "@/lib/engine/compareMoves";
import { getStockfishEngine } from "@/lib/engine";

export type CompareMovesStatus = "idle" | "loading" | "ready" | "error";

export interface UseCompareMovesOptions {
  parentFen: string;
  moverColor: "w" | "b";
  alternatives: CompareAlternative[];
  enabled: boolean;
}

export interface UseCompareMovesResult {
  results: Map<string, CompareMoveResult>;
  status: CompareMovesStatus;
  error: string | null;
  progress: { done: number; total: number };
  startCompare: () => void;
  cancelCompare: () => void;
}

export function useCompareMoves({
  parentFen,
  moverColor,
  alternatives,
  enabled,
}: UseCompareMovesOptions): UseCompareMovesResult {
  const [results, setResults] = useState<Map<string, CompareMoveResult>>(
    () => new Map(),
  );
  const [status, setStatus] = useState<CompareMovesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const tokenRef = useRef(0);

  const stopWorker = useCallback(() => {
    tokenRef.current += 1;
    try {
      getStockfishEngine().stop();
    } catch {
      // Engine may not be initialized yet.
    }
  }, []);

  const cancelCompare = useCallback(() => {
    stopWorker();
    setStatus("idle");
    setError(null);
    setProgress({ done: 0, total: 0 });
    setResults(new Map());
  }, [stopWorker]);

  const runCompare = useCallback(
    async (token: number) => {
      const total = Math.min(alternatives.length, 3);
      setStatus("loading");
      setError(null);
      setResults(new Map());
      setProgress({ done: 0, total });

      try {
        getStockfishEngine().stop();
        const engine = getStockfishEngine();
        const ranked = await compareMoves(engine, {
          parentFen,
          moverColor,
          alternatives,
          onProgress: (done, total) => {
            if (token !== tokenRef.current) {
              return;
            }
            setProgress({ done, total });
          },
        });

        if (token !== tokenRef.current) {
          return;
        }

        const nextResults = new Map<string, CompareMoveResult>();
        for (const entry of ranked) {
          nextResults.set(entry.nodeId, entry);
        }
        setResults(nextResults);
        setProgress({ done: total, total });
        setStatus("ready");
      } catch (err) {
        if (token !== tokenRef.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Compare moves failed.";
        setError(message);
        setStatus("error");
      }
    },
    [alternatives, moverColor, parentFen],
  );

  const startCompare = useCallback(() => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    void runCompare(token);
  }, [runCompare]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const token = tokenRef.current + 1;
    tokenRef.current = token;
    void runCompare(token);

    return () => {
      stopWorker();
    };
  }, [enabled, runCompare, stopWorker]);

  useEffect(() => {
    return () => {
      stopWorker();
    };
  }, [stopWorker]);

  return {
    results: enabled ? results : new Map(),
    status: enabled ? status : "idle",
    error: enabled ? error : null,
    progress: enabled ? progress : { done: 0, total: 0 },
    startCompare,
    cancelCompare,
  };
}
