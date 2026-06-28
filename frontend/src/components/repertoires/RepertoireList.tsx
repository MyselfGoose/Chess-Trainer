"use client";

import Link from "next/link";

import { useRepertoires } from "@/hooks/useRepertoires";
import type { Repertoire } from "@/lib/repertoires";

import { LegacyMigrationBanner } from "./LegacyMigrationBanner";
import { RepertoireCard } from "./RepertoireCard";

function groupRepertoires(repertoires: Repertoire[]) {
  return {
    imported: repertoires.filter((item) => item.source === "imported"),
    created: repertoires.filter((item) => item.source === "created"),
  };
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-surface p-10 text-center ring-1 ring-border">
      <p className="text-lg font-semibold text-foreground">No repertoires yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Import a PGN file or create a repertoire from scratch to get started.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/upload"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Import PGN
        </Link>
        <Link
          href="/repertoires/new"
          className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border-strong transition hover:bg-background"
        >
          Create repertoire
        </Link>
      </div>
    </div>
  );
}

function RepertoireSection({
  title,
  items,
  onRefresh,
}: {
  title: string;
  items: Repertoire[];
  onRefresh: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((repertoire) => (
          <RepertoireCard
            key={repertoire.id}
            repertoire={repertoire}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  );
}

export function RepertoireList() {
  const { repertoires, isHydrated, refresh } = useRepertoires();

  if (!isHydrated) {
    return (
      <p className="text-center text-sm text-muted-foreground">Loading repertoires…</p>
    );
  }

  const { imported, created } = groupRepertoires(repertoires);

  return (
    <div className="space-y-8">
      <LegacyMigrationBanner onMigrated={refresh} />

      {repertoires.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <RepertoireSection
            title="Imported"
            items={imported}
            onRefresh={refresh}
          />
          <RepertoireSection
            title="Created"
            items={created}
            onRefresh={refresh}
          />
        </>
      )}
    </div>
  );
}
