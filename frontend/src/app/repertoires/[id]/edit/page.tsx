"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { RepertoireBuilder } from "@/components/repertoires/RepertoireBuilder";
import { getRepertoire } from "@/lib/repertoires";

export default function EditRepertoirePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isHydrated, setIsHydrated] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const repertoire = getRepertoire(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setExists(Boolean(repertoire && repertoire.source === "created"));
    setIsHydrated(true);
  }, [id]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <h1 className="text-xl font-semibold text-foreground">
          Repertoire not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only manually created repertoires can be edited.
        </p>
        <Link
          href="/repertoires"
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Back to repertoires
        </Link>
      </div>
    );
  }

  return <RepertoireBuilder repertoireId={id} />;
}
