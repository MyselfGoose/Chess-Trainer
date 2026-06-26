"use client";

import Link from "next/link";
import { use } from "react";

import { TrainingSetup } from "@/components/training/TrainingSetup";

export default function TrainingSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-full overflow-y-auto bg-zinc-100 px-4 py-10">
      <Link
        href="/training"
        className="mb-6 inline-block text-sm font-medium text-green-700"
      >
        ← Back to training
      </Link>
      <TrainingSetup repertoireId={id} />
    </div>
  );
}
