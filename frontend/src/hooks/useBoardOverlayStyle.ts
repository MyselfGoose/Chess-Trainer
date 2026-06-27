"use client";

import { useEffect, useState, type CSSProperties } from "react";

export function useBoardOverlayStyle(
  containerRef: React.RefObject<HTMLElement | null>,
  boardRef: React.RefObject<HTMLElement | null>,
  orientation: "white" | "black",
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    position: "absolute",
    inset: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const root = boardRef.current;
    if (!container || !root) {
      return;
    }

    const update = () => {
      const boardEl = root.querySelector("cg-board");
      if (!(boardEl instanceof HTMLElement)) {
        setStyle({ position: "absolute", inset: 0 });
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const boardRect = boardEl.getBoundingClientRect();
      setStyle({
        position: "absolute",
        left: boardRect.left - containerRect.left,
        top: boardRect.top - containerRect.top,
        width: boardRect.width,
        height: boardRect.height,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(root);

    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(root, { childList: true, subtree: true });

    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [boardRef, containerRef, orientation]);

  return style;
}
