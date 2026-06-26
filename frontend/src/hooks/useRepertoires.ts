"use client";

import { useCallback, useEffect, useState } from "react";

import { listRepertoires, type Repertoire } from "@/lib/repertoires";

export function useRepertoires() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setRepertoires(listRepertoires());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    refresh();
    setIsHydrated(true);
  }, [refresh]);

  return { repertoires, isHydrated, refresh };
}
