"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { RepertoireDashboard } from "@/components/repertoires/RepertoireDashboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadEcoData } from "@/lib/openings/lookup";
import type { EcoEntry } from "@/lib/openings/lookup";
import { computeRepertoireAnalytics } from "@/lib/repertoires/analytics";
import { getRepertoire } from "@/lib/repertoires";
import type { Repertoire } from "@/lib/repertoires";
import {
  getMasteryForRepertoire,
  getTrainingHistory,
} from "@/lib/training";

export default function RepertoireDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isHydrated, setIsHydrated] = useState(false);
  const [repertoire, setRepertoire] = useState<Repertoire | null>(null);
  const [ecoEntries, setEcoEntries] = useState<EcoEntry[] | null>(null);
  const [ecoError, setEcoError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setRepertoire(getRepertoire(id));
    setIsHydrated(true);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    loadEcoData()
      .then((entries) => {
        if (!cancelled) {
          setEcoEntries(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEcoError("Opening data unavailable — ECO breakdown may be incomplete.");
          setEcoEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const analytics = useMemo(() => {
    if (!repertoire || ecoEntries === null) {
      return null;
    }
    return computeRepertoireAnalytics(
      repertoire,
      getMasteryForRepertoire(repertoire.id),
      getTrainingHistory(),
      ecoEntries,
    );
  }, [ecoEntries, repertoire]);

  if (!isHydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </main>
    );
  }

  if (!repertoire) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <EmptyState
          title="Repertoire not found"
          description="This repertoire may have been deleted or the link is invalid."
          actions={
            <Link
              href="/repertoires"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Back to repertoires
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/repertoires" className="hover:text-accent">
          Repertoires
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/repertoires/${repertoire.id}`} className="hover:text-accent">
          {repertoire.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Dashboard</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {repertoire.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Training analytics and repertoire overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/study/${repertoire.id}`}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Study
          </Link>
          <Link
            href={`/training/${repertoire.id}`}
            className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
          >
            Train
          </Link>
        </div>
      </div>

      {ecoError ? (
        <p className="mt-4 text-sm text-warning">{ecoError}</p>
      ) : null}

      {analytics ? (
        <div className="mt-8">
          <RepertoireDashboard repertoire={repertoire} analytics={analytics} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Loading analytics…
        </p>
      )}
    </main>
  );
}
