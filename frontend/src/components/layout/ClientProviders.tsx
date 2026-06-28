"use client";

import { useEffect, type ReactNode } from "react";

import { KeyboardShortcutsDialog } from "@/components/help/KeyboardShortcutsDialog";
import { preloadFeedbackSounds } from "@/lib/sounds/feedbackSounds";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

function SoundPreloader() {
  useEffect(() => {
    const preload = () => preloadFeedbackSounds();
    window.addEventListener("pointerdown", preload, { once: true });
    window.addEventListener("keydown", preload, { once: true });
    return () => {
      window.removeEventListener("pointerdown", preload);
      window.removeEventListener("keydown", preload);
    };
  }, []);

  return null;
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <KeyboardShortcutsDialog />
      <SoundPreloader />
    </ThemeProvider>
  );
}
