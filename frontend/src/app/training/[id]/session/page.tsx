"use client";

import { Suspense } from "react";

import { TrainingSessionContent } from "@/components/training/TrainingSessionContent";

export default function TrainingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-surface-muted">
          <p className="text-sm text-muted-foreground">Loading training…</p>
        </div>
      }
    >
      <TrainingSessionContent params={params} />
    </Suspense>
  );
}
