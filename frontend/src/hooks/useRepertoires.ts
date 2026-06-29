"use client";

import { useCallback, useEffect, useState } from "react";

import { listRepertoires, type Repertoire } from "@/lib/repertoires";
import { ensureStorageInitialized } from "@/lib/storage/migrate";

export function useRepertoires() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setRepertoires(listRepertoires());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureStorageInitialized().then(() => {
      if (!cancelled) {
        refresh();
        setIsHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { repertoires, isHydrated, refresh };
}
