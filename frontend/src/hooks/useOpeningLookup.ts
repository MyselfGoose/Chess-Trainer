import { useEffect, useState } from "react";

import {
  isStartingPosition,
  resolveOpeningForPosition,
  type OpeningInfo,
} from "@/lib/openings";

export function useOpeningLookup(
  fen: string,
  sanMoves: string[],
): { opening: OpeningInfo | null; isLoading: boolean } {
  const [opening, setOpening] = useState<OpeningInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const moveKey = sanMoves.join("|");
  const atStart = isStartingPosition(fen) && sanMoves.length === 0;

  useEffect(() => {
    if (atStart) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      void resolveOpeningForPosition(fen, sanMoves)
        .then((info) => {
          if (!cancelled) {
            setOpening(info);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOpening(null);
            setIsLoading(false);
          }
        });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [atStart, fen, moveKey, sanMoves]);

  if (atStart) {
    return { opening: null, isLoading: false };
  }

  return { opening, isLoading };
}
