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
        <div className="flex h-full items-center justify-center bg-zinc-100">
          <p className="text-sm text-zinc-500">Loading training…</p>
        </div>
      }
    >
      <TrainingSessionContent params={params} />
    </Suspense>
  );
}
