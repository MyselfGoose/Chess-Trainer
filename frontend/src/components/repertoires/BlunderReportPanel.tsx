"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BLUNDER_DROP_THRESHOLD_CP,
  BLUNDER_SCAN_DEPTH,
  countScanNodes,
  formatDropCp,
} from "@/lib/repertoires/blunderReport";
import type { Repertoire } from "@/lib/repertoires/types";
import { useBlunderScan } from "@/hooks/useBlunderScan";

interface BlunderReportPanelProps {
  repertoire: Repertoire;
}

const LARGE_SCAN_THRESHOLD = 500;

export function BlunderReportPanel({ repertoire }: BlunderReportPanelProps) {
  const scan = useBlunderScan(repertoire);
  const [confirmLargeScan, setConfirmLargeScan] = useState(false);
  const nodeCount = countScanNodes(repertoire);
  const isLargeScan = nodeCount > LARGE_SCAN_THRESHOLD;

  const handleStartScan = () => {
    if (isLargeScan && !confirmLargeScan) {
      setConfirmLargeScan(true);
      return;
    }
    setConfirmLargeScan(false);
    scan.startScan();
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Engine blunder check
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Engine flag — verify with your coach.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scans ~{nodeCount} positions at depth {BLUNDER_SCAN_DEPTH}. Flags eval
            drops above {BLUNDER_DROP_THRESHOLD_CP}cp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scan.status === "scanning" ? (
            <button
              type="button"
              onClick={scan.cancelScan}
              className="min-h-9 rounded-lg bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartScan}
              className="min-h-9 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Scan repertoire
            </button>
          )}
          {scan.report ? (
            <button
              type="button"
              onClick={scan.clearReport}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Clear report
            </button>
          ) : null}
        </div>
      </div>

      {confirmLargeScan ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-muted/40 p-3">
          <p className="text-sm text-foreground">
            This repertoire has {nodeCount} positions. The scan may take several
            minutes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStartScan}
              className="min-h-9 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
            >
              Continue scan
            </button>
            <button
              type="button"
              onClick={() => setConfirmLargeScan(false)}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {scan.status === "scanning" && scan.progress ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Scanning {scan.progress.done}/{scan.progress.total}
            </span>
            {scan.progress.currentLabel ? (
              <span className="truncate">{scan.progress.currentLabel}</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${
                  scan.progress.total > 0
                    ? (scan.progress.done / scan.progress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {scan.error ? (
        <p className="mt-4 text-sm text-danger">{scan.error}</p>
      ) : null}

      {scan.status === "cancelled" ? (
        <p className="mt-4 text-sm text-muted-foreground">Scan cancelled.</p>
      ) : null}

      {scan.report ? (
        <div className="mt-4">
          {scan.report.flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No flags above {scan.report.thresholdCp}cp in the last scan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Move</th>
                    <th className="px-2 py-2 font-medium">Line</th>
                    <th className="px-2 py-2 font-medium">Drop</th>
                    <th className="px-2 py-2 font-medium">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scan.report.flags.map((flag) => (
                    <tr
                      key={`${flag.gameIndex}:${flag.nodeId}`}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-2 font-mono font-semibold text-foreground">
                        {flag.san}
                      </td>
                      <td className="max-w-xs truncate px-2 py-2 text-muted-foreground">
                        {flag.pathLabel}
                      </td>
                      <td className="px-2 py-2 font-mono text-foreground">
                        {formatDropCp(flag.dropCp)}
                      </td>
                      <td className="px-2 py-2">
                        <Link
                          href={`/study/${repertoire.id}?game=${flag.gameIndex}&node=${flag.nodeId}`}
                          className="text-sm font-medium text-accent hover:text-accent-hover"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Last scanned {new Date(scan.report.scannedAt).toLocaleString()}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
