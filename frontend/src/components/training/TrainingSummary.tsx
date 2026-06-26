"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { TrainingSessionSummary } from "@/lib/training";

interface TrainingSummaryProps {
  summary: TrainingSessionSummary;
  repertoireId: string;
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

  const failedLineIds = failed.map((result) => result.lineId).join(",");
  const skippedLineIds = summary.skippedLines
    .map((line) => line.lineId)
    .join(",");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h2 className="text-xl font-bold text-zinc-900">
        {summary.endedEarly ? "Training ended early" : "Training complete"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        {passed.length} / {attempted} lines passed ({passRate}%)
        {summary.endedEarly ? (
          <>
            {" "}
            · {attempted} of {summary.totalLinesPlanned} lines attempted
          </>
        ) : null}
      </p>

      {summary.endedEarly && attempted === 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          You ended before completing any lines. Start again when you are ready.
        </p>
      ) : null}

      {passed.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Passed ({passed.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {passed.map((result) => (
              <li
                key={result.lineId}
                className="rounded-lg bg-green-50 px-3 py-2 font-mono text-xs text-green-900 ring-1 ring-green-200"
              >
                {result.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {failed.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Needs work ({failed.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {failed.map((result) => (
              <li
                key={result.lineId}
                className="rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-200"
              >
                <p className="font-mono text-xs text-red-900">{result.label}</p>
                {result.expectedSan ? (
                  <p className="mt-1 text-xs text-red-700">
                    Expected: {result.expectedSan}
                    {result.failedAtSan
                      ? ` · You played: ${result.failedAtSan}`
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Not attempted ({summary.skippedLines.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {summary.skippedLines.map((line) => (
              <li
                key={line.lineId}
                className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 ring-1 ring-zinc-200"
              >
                {line.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {failed.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/training/${repertoireId}/session?color=${summary.userColor}&lines=${encodeURIComponent(failedLineIds)}`,
              )
            }
            className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Train failed lines
          </button>
        ) : null}
        {summary.skippedLines.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/training/${repertoireId}/session?color=${summary.userColor}&lines=${encodeURIComponent(skippedLineIds)}`,
              )
            }
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300"
          >
            Train skipped lines
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            router.push(
              `/training/${repertoireId}/session?color=${summary.userColor}`,
            )
          }
          className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300"
        >
          Train again
        </button>
        <Link
          href={`/study/${repertoireId}`}
          className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300"
        >
          Study repertoire
        </Link>
        <Link
          href="/training"
          className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-zinc-600"
        >
          Back to training
        </Link>
      </div>
    </div>
  );
}
