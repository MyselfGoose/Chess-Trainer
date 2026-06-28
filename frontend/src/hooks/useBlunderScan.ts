"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getStockfishEngine } from "@/lib/engine";
import {
  clearBlunderReport,
  loadBlunderReport,
  saveBlunderReport,
  scanRepertoireForBlunders,
  type BlunderReport,
  type BlunderScanProgress,
} from "@/lib/repertoires/blunderReport";
import type { Repertoire } from "@/lib/repertoires/types";

export type BlunderScanStatus =
  | "idle"
  | "scanning"
  | "ready"
  | "error"
  | "cancelled";

export interface UseBlunderScanResult {
  report: BlunderReport | null;
  status: BlunderScanStatus;
  progress: BlunderScanProgress | null;
  error: string | null;
  startScan: () => void;
  cancelScan: () => void;
  clearReport: () => void;
}

export function useBlunderScan(repertoire: Repertoire): UseBlunderScanResult {
  const [report, setReport] = useState<BlunderReport | null>(() =>
    loadBlunderReport(repertoire.id),
  );
  const [status, setStatus] = useState<BlunderScanStatus>(() =>
    loadBlunderReport(repertoire.id) ? "ready" : "idle",
  );
  const [progress, setProgress] = useState<BlunderScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenRef = useRef(0);
  const cancelRef = useRef(false);

  const stopWorker = useCallback(() => {
    tokenRef.current += 1;
    cancelRef.current = true;
    try {
      getStockfishEngine().stop();
    } catch {
      // Engine may not be initialized yet.
    }
  }, []);

  const clearReportState = useCallback(() => {
    clearBlunderReport(repertoire.id);
    setReport(null);
    setStatus("idle");
    setProgress(null);
    setError(null);
  }, [repertoire.id]);

  const cancelScan = useCallback(() => {
    stopWorker();
    setStatus("cancelled");
    setProgress(null);
  }, [stopWorker]);

  const runScan = useCallback(
    async (token: number) => {
      cancelRef.current = false;
      setStatus("scanning");
      setError(null);
      setProgress({ done: 0, total: 0 });

      try {
        getStockfishEngine().stop();
        const nextReport = await scanRepertoireForBlunders(getStockfishEngine(), {
          repertoire,
          shouldCancel: () => cancelRef.current || token !== tokenRef.current,
          onProgress: (entry) => {
            if (token !== tokenRef.current) {
              return;
            }
            setProgress(entry);
          },
        });

        if (token !== tokenRef.current || cancelRef.current) {
          setStatus("cancelled");
          setProgress(null);
          return;
        }

        saveBlunderReport(nextReport);
        setReport(nextReport);
        setProgress(null);
        setStatus("ready");
      } catch (err) {
        if (token !== tokenRef.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Blunder scan failed.";
        setError(message);
        setStatus("error");
        setProgress(null);
      }
    },
    [repertoire],
  );

  const startScan = useCallback(() => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    cancelRef.current = false;
    void runScan(token);
  }, [runScan]);

  useEffect(() => {
    return () => {
      stopWorker();
    };
  }, [stopWorker]);

  return {
    report,
    status,
    progress,
    error,
    startScan,
    cancelScan,
    clearReport: clearReportState,
  };
}
