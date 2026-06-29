"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import {
  GlobalSearchPalette,
  useGlobalSearchShortcut,
} from "@/components/search/GlobalSearchPalette";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/repertoires", label: "Repertoires" },
  { href: "/training", label: "Training" },
  { href: "/prep", label: "Prep" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSession, setSearchSession] = useState(0);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setSearchSession((session) => session + 1);
    setSearchOpen(true);
    closeMobile();
  }, [closeMobile]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useGlobalSearchShortcut(openSearch, !searchOpen);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-foreground"
            onClick={closeMobile}
          >
            Repertoire<span className="text-accent">Lab</span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${active ? "nav-link-active" : "nav-link-idle"}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openSearch}
              className="ml-1 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
              aria-label="Search repertoires (Cmd+K)"
            >
              <SearchIcon />
            </button>
            <div className="ml-2 border-l border-border pl-2">
              <ThemeToggleButton />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={openSearch}
              className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted"
              aria-label="Search repertoires (Cmd+K)"
            >
              <SearchIcon />
            </button>
            <ThemeToggleButton />
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-border bg-surface px-4 py-2 sm:hidden">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className={`block nav-link ${active ? "nav-link-active" : "nav-link-idle"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <GlobalSearchPalette
        open={searchOpen}
        sessionKey={searchSession}
        onClose={closeSearch}
      />
    </>
  );
}
