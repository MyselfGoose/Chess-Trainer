"use client";

import Link from "next/link";

import { BlunderReportPanel } from "@/components/repertoires/BlunderReportPanel";
import { RepertoireDiffPanel } from "@/components/repertoires/RepertoireDiffPanel";
import { CoverageMap } from "@/components/training/CoverageMap";
import { formatPassRate } from "@/lib/training/history";
import { extractTrainingLines } from "@/lib/training/lines";
import type { LineStatsSummary } from "@/lib/training/lineStats";
import type { Repertoire } from "@/lib/repertoires/types";
import type { RepertoireAnalytics } from "@/lib/repertoires/analytics";

interface RepertoireDashboardProps {
  repertoire: Repertoire;
  analytics: RepertoireAnalytics;
}

function formatStudiedDate(iso: string | null): string {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function HorizontalBarChart({
  items,
}: {
  items: Array<{ label: string; sublabel?: string; count: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">
              {item.label}
              {item.sublabel ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  {item.sublabel}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DepthHistogram({
  buckets,
}: {
  buckets: RepertoireAnalytics["depthHistogram"];
}) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.lineCount));

  return (
    <div className="flex items-end gap-2">
      {buckets.map((bucket) => {
        const label =
          bucket.maxPly >= 99
            ? `${bucket.minPly}+`
            : `${bucket.minPly}–${bucket.maxPly}`;
        const heightPercent = (bucket.lineCount / max) * 100;
        return (
          <div
            key={bucket.minPly}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-medium text-foreground">
              {bucket.lineCount}
            </span>
            <div className="flex h-28 w-full items-end rounded-md bg-background px-1 pb-1">
              <div
                className="w-full rounded-sm bg-accent"
                style={{ height: `${Math.max(heightPercent, bucket.lineCount > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className="text-center text-[10px] text-muted-foreground">
              {label} plies
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeakLinesList({
  repertoireId,
  weakLines,
  lineLabels,
}: {
  repertoireId: string;
  weakLines: LineStatsSummary[];
  lineLabels: Map<string, string>;
}) {
  if (weakLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No weak lines yet. Weak lines appear after 2+ attempts with pass rate
        below 50%.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {weakLines.map((line) => (
        <li key={line.lineId}>
          <Link
            href={`/training/${repertoireId}?weak=${line.lineId}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:border-accent hover:bg-accent-muted"
          >
            <span className="min-w-0 truncate font-medium text-foreground">
              {lineLabels.get(line.lineId) ?? line.lineId}
            </span>
            <span className="shrink-0 text-xs text-danger">
              {formatPassRate(line.passRate)} pass
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RepertoireDashboard({
  repertoire,
  analytics,
}: RepertoireDashboardProps) {
  const lines = extractTrainingLines(repertoire);
  const lineLabels = new Map(lines.map((line) => [line.id, line.label]));

  const openingItems = analytics.openingBreakdown.map((entry) => ({
    label: entry.eco,
    sublabel: entry.name,
    count: entry.lineCount,
  }));

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Total lines" value={analytics.totalLines} />
        <SummaryCard label="Coverage" value={`${analytics.coveragePercent}%`} />
        <SummaryCard label="Readiness" value={`${analytics.readinessPercent}%`} />
        <SummaryCard
          label="Last studied"
          value={formatStudiedDate(analytics.lastStudiedAt)}
        />
        <SummaryCard label="Weak lines" value={analytics.weakLineCount} />
      </dl>

      <BlunderReportPanel repertoire={repertoire} />

      <RepertoireDiffPanel repertoire={repertoire} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Lines by opening
          </h2>
          <div className="mt-4">
            {openingItems.length > 0 ? (
              <HorizontalBarChart items={openingItems} />
            ) : (
              <p className="text-sm text-muted-foreground">No lines to analyze.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Depth histogram
          </h2>
          <div className="mt-4">
            <DepthHistogram buckets={analytics.depthHistogram} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Weak lines</h2>
        <div className="mt-4">
          <WeakLinesList
            repertoireId={repertoire.id}
            weakLines={analytics.weakLines}
            lineLabels={lineLabels}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Chapter breakdown
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Chapter</th>
                <th className="pb-2 pr-4 font-medium">Lines</th>
                <th className="pb-2 pr-4 font-medium">Trained</th>
                <th className="pb-2 font-medium">Weak</th>
              </tr>
            </thead>
            <tbody>
              {analytics.chapterBreakdown.map((row) => (
                <tr key={row.chapterId} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium text-foreground">
                    {row.name}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.lineCount}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.trainedCount}
                  </td>
                  <td className="py-2 text-muted-foreground">{row.weakCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <CoverageMap lines={lines} repertoireId={repertoire.id} />
      </section>
    </div>
  );
}
