import Link from "next/link";

import { TournamentCountdownBanner } from "@/components/prep/TournamentCountdownBanner";

function HeroBoardIllustration() {
  const light = "bg-[#eeeed2] dark:bg-[#484742]";
  const dark = "bg-[#769656] dark:bg-[#312e2b]";
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return (row + col) % 2 === 0 ? light : dark;
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {squares.map((color, index) => (
          <div key={index} className={color} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="app-card px-4 py-2 text-center backdrop-blur-sm">
          <p className="text-sm font-semibold text-foreground">1. e4 e5 2. Nf3</p>
          <p className="text-xs text-muted-foreground">Your repertoire, move by move</p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Import or build",
    description:
      "Upload a PGN file with your existing lines, or create a repertoire from scratch on the board.",
  },
  {
    title: "Register variations",
    description:
      "Play through moves, register complete lines, and branch into alternate variations at any point.",
  },
  {
    title: "Study interactively",
    description:
      "Walk your tree on an interactive board — only repertoire moves are allowed, just like real study.",
  },
  {
    title: "Drill with training",
    description:
      "Run pass/fail drills on your lines with spaced repetition scheduling and weak-line focus.",
  },
] as const;

const FEATURES = [
  "Full variation trees with comments and annotations from PGN",
  "Opening drills with pass/fail feedback and spaced repetition",
  "Line statistics — depth, branch count, and total moves",
  "Board-based study with repertoire-constrained move choices",
  "Local library — keep multiple repertoires and switch anytime",
] as const;

export default function HomePage() {
  return (
    <div className="overflow-y-auto bg-background">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">
              Chess opening lab
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Build, import, and study your opening repertoire
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              RepertoireLab helps you organize chess opening lines, explore
              variations, and drill them on an interactive board — whether you
              import from PGN or build from scratch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/repertoires/new" className="btn-primary px-5 py-2.5">
                Create a repertoire
              </Link>
              <Link href="/training" className="btn-secondary px-5 py-2.5">
                Start training
              </Link>
            </div>
            <TournamentCountdownBanner />
          </div>
          <HeroBoardIllustration />
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-foreground">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="app-card p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-bold text-accent-foreground">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-foreground">
            Everything you need to study openings
          </h2>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 app-card p-4"
              >
                <span className="mt-0.5 text-accent" aria-hidden>
                  ✓
                </span>
                <span className="text-sm text-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-8">
        <p className="text-center text-sm text-muted-foreground">
          Just want to play?{" "}
          <Link
            href="/board"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Open an empty board
          </Link>
        </p>
      </footer>
    </div>
  );
}
