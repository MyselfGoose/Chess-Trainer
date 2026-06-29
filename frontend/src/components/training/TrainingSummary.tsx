"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  computePassRateTrend,
  createDefaultTrainingConfig,
  encodeTrainingConfig,
  getTrainingHistory,
  linesWithFailurePly,
  type TrainingSessionSummary,
} from "@/lib/training";

interface TrainingSummaryProps {
  summary: TrainingSessionSummary;
  repertoireId: string;
}

function buildRetryConfig(
  summary: TrainingSessionSummary,
  repertoireId: string,
  lineIds: string[],
  drillFromFailure?: boolean,
) {
  return {
    ...createDefaultTrainingConfig(repertoireId, summary.userColor),
    lineIds,
    drillFromFailure: drillFromFailure ? true : undefined,
  };
}

export function TrainingSummary({
  summary,
  repertoireId,
}: TrainingSummaryProps) {
  const router = useRouter();
  const passed = summary.results.filter((result) => result.passed);
  const failed = summary.results.filter((result) => !result.passed);
  const attempted = summary.results.length;
  const passRate =
    attempted > 0 ? Math.round((passed.length / attempted) * 100) : 0;

  const trend = computePassRateTrend(
    repertoireId,
    summary.userColor,
    getTrainingHistory(),
  );

  const failedLineIds = failed.map((result) => result.lineId);
  const failureDrillResults = linesWithFailurePly(failed);
  const failureDrillLineIds = failureDrillResults.map((result) => result.lineId);
  const skippedLineIds = summary.skippedLines.map((line) => line.lineId);

  const pushConfig = (config: ReturnType<typeof buildRetryConfig>) => {
    router.push(
      `/training/${repertoireId}/session?config=${encodeTrainingConfig(config)}`,
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h2 className="text-xl font-bold text-foreground">
        {summary.endedEarly ? "Training ended early" : "Training complete"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {passed.length} / {attempted} lines passed ({passRate}%)
        {summary.endedEarly ? (
          <>
            {" "}
            · {attempted} of {summary.totalLinesPlanned} lines attempted
          </>
        ) : null}
      </p>

      {summary.repertoireNames && summary.repertoireNames.length > 1 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Mixed session: {summary.repertoireNames.join(", ")}
        </p>
      ) : null}

      {trend ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Pass rate trend: {Math.round(trend.from * 100)}% →{" "}
          {Math.round(trend.to * 100)}% over last sessions
        </p>
      ) : null}

      {summary.endedEarly && attempted === 0 ? (
        <p className="mt-2 rounded-lg bg-warning-muted px-3 py-2 text-sm text-warning-foreground ring-1 ring-warning/30">
          You ended before completing any lines. Start again when you are ready.
        </p>
      ) : null}

      {passed.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
            Passed ({passed.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {passed.map((result) => (
              <li
                key={result.lineId}
                className="rounded-lg bg-accent-muted px-3 py-2 font-mono text-xs text-accent-foreground ring-1 ring-accent/30"
              >
                {result.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {failed.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-danger">
            Needs work ({failed.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {failed.map((result) => (
              <li
                key={result.lineId}
                className="rounded-lg bg-danger-muted px-3 py-2 ring-1 ring-danger/30"
              >
                <p className="font-mono text-xs text-red-900">{result.label}</p>
                {result.expectedSan ? (
                  <p className="mt-1 text-xs text-danger">
                    Expected: {result.expectedSan}
                    {result.failedAtSan
                      ? ` · You played: ${result.failedAtSan}`
                      : null}
                    {result.failedAtPly !== undefined
                      ? ` · Failed at ply ${result.failedAtPly + 1}`
                      : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.skippedLines.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Not attempted ({summary.skippedLines.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {summary.skippedLines.map((line) => (
              <li
                key={line.lineId}
                className="rounded-lg bg-background px-3 py-2 font-mono text-xs text-muted-foreground ring-1 ring-border"
              >
                {line.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {failureDrillLineIds.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              pushConfig(
                buildRetryConfig(
                  summary,
                  repertoireId,
                  failureDrillLineIds,
                  true,
                ),
              )
            }
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
          >
            Drill failure points ({failureDrillLineIds.length})
          </button>
        ) : null}
        {failed.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              pushConfig(buildRetryConfig(summary, repertoireId, failedLineIds))
            }
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
          >
            Train failed lines
          </button>
        ) : null}
        {summary.skippedLines.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              pushConfig(buildRetryConfig(summary, repertoireId, skippedLineIds))
            }
            className="rounded-lg bg-surface px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border-strong"
          >
            Train skipped lines
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            pushConfig(buildRetryConfig(summary, repertoireId, []))
          }
          className="rounded-lg bg-surface px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border-strong"
        >
          Train again
        </button>
        <Link
          href={`/study/${repertoireId}`}
          className="rounded-lg bg-surface px-4 py-2.5 text-center text-sm font-semibold text-foreground ring-1 ring-border-strong"
        >
          Study repertoire
        </Link>
        <Link
          href="/training"
          className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-muted-foreground"
        >
          Back to training
        </Link>
      </div>
    </div>
  );
}
