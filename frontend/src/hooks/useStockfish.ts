"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ENGINE_DEPTH,
  getStockfishEngine,
  type EngineEvaluation,
  type EngineStatus,
} from "@/lib/engine";

export interface UseStockfishOptions {
  fen: string;
  enabled: boolean;
}

export interface UseStockfishResult {
  evaluation: EngineEvaluation | null;
  status: EngineStatus;
  error: string | null;
  depth: number;
  isEngineReady: boolean;
  targetDepth: number;
  startAnalysis: () => void;
  stopAnalysis: () => void;
}

function detectMobileEngineProfile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(max-width: 1023px)").matches;
}

function resolveTargetDepth(isMobile: boolean): number {
  return isMobile ? ENGINE_DEPTH.mobileDefault : ENGINE_DEPTH.desktopDefault;
}

function resolveMaxDepth(isMobile: boolean): number {
  return isMobile ? ENGINE_DEPTH.mobileMax : ENGINE_DEPTH.desktopMax;
}

export function useStockfish({
  fen,
  enabled,
}: UseStockfishOptions): UseStockfishResult {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [isEngineReady, setIsEngineReady] = useState(false);

  const analysisTokenRef = useRef(0);
  const isMobile = useMemo(() => detectMobileEngineProfile(), []);
  const targetDepth = useMemo(
    () => Math.min(resolveTargetDepth(isMobile), resolveMaxDepth(isMobile)),
    [isMobile],
  );

  const stopWorker = useCallback(() => {
    analysisTokenRef.current += 1;
    try {
      getStockfishEngine().stop();
    } catch {
      // Engine may not be initialized yet.
    }
  }, []);

  const stopAnalysis = useCallback(() => {
    stopWorker();
    setStatus((current) => (current === "error" ? current : "idle"));
    setDepth(0);
    setEvaluation(null);
  }, [stopWorker]);

  const runAnalysis = useCallback(
    async (fenToAnalyze: string, token: number) => {
      setStatus("loading");
      setError(null);
      setDepth(0);
      setEvaluation(null);

      try {
        const engine = getStockfishEngine();
        await engine.init();
        if (token !== analysisTokenRef.current) {
          return;
        }
        setIsEngineReady(true);
        await engine.setPosition(fenToAnalyze);
        if (token !== analysisTokenRef.current) {
          return;
        }

        setStatus("analyzing");
        for await (const nextEvaluation of engine.analyze(targetDepth)) {
          if (token !== analysisTokenRef.current) {
            engine.stop();
            return;
          }
          setEvaluation(nextEvaluation);
          setDepth(nextEvaluation.depth);
        }
        if (token === analysisTokenRef.current) {
          setStatus("ready");
        }
      } catch (err) {
        if (token !== analysisTokenRef.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Engine analysis failed.";
        setError(message);
        setStatus("error");
        setIsEngineReady(false);
      }
    },
    [targetDepth],
  );

  const startAnalysis = useCallback(() => {
    const token = analysisTokenRef.current + 1;
    analysisTokenRef.current = token;
    void runAnalysis(fen, token);
  }, [fen, runAnalysis]);

  useEffect(() => {
    if (!enabled) {
      stopWorker();
      return undefined;
    }

    const token = analysisTokenRef.current + 1;
    analysisTokenRef.current = token;
    void runAnalysis(fen, token);

    return () => {
      stopWorker();
    };
  }, [enabled, fen, runAnalysis, stopWorker]);

  useEffect(() => {
    return () => {
      stopWorker();
    };
  }, [stopWorker]);

  return {
    evaluation: enabled ? evaluation : null,
    status: enabled ? status : "idle",
    error: enabled ? error : null,
    depth: enabled ? depth : 0,
    isEngineReady,
    targetDepth,
    startAnalysis,
    stopAnalysis,
  };
}
