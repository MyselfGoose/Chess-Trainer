"use client";

import Link from "next/link";
import { useState } from "react";

import { MergeRepertoiresModal } from "@/components/repertoires/MergeRepertoiresModal";
import { RepertoireBackupSection } from "@/components/repertoires/RepertoireBackupSection";
import { RepertoireList } from "@/components/repertoires/RepertoireList";

export default function RepertoiresPage() {
  const [showMerge, setShowMerge] = useState(false);

  return (
    <div className="min-h-full overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your repertoires</h1>
            <p className="mt-1 text-muted-foreground">
              Study imported PGNs or repertoires you built by hand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMerge(true)}
              className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border-strong transition hover:bg-background"
            >
              Merge repertoires
            </button>
            <Link
              href="/upload"
              className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border-strong transition hover:bg-background"
            >
              Import PGN
            </Link>
            <Link
              href="/repertoires/new"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Create repertoire
            </Link>
          </div>
        </header>

        <RepertoireList />
        <RepertoireBackupSection />
      </div>

      {showMerge ? (
        <MergeRepertoiresModal
          onComplete={() => setShowMerge(false)}
          onCancel={() => setShowMerge(false)}
        />
      ) : null}
    </div>
  );
}
