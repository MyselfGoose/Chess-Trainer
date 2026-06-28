"use client";

import dynamic from "next/dynamic";

const ThemeToggleLazy = dynamic(
  () =>
    import("@/components/theme/ThemeToggle").then((module) => ({
      default: module.ThemeToggle,
    })),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-block h-9 w-9 rounded-lg bg-surface-muted"
        aria-hidden
      />
    ),
  },
);

export function ThemeToggleButton() {
  return <ThemeToggleLazy />;
}
