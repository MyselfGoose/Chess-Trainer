import Link from "next/link";

function HeroBoardIllustration() {
  const light = "bg-amber-100";
  const dark = "bg-amber-700";
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return (row + col) % 2 === 0 ? light : dark;
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {squares.map((color, index) => (
          <div key={index} className={color} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-lg bg-white/90 px-4 py-2 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-zinc-900">1. e4 e5 2. Nf3</p>
          <p className="text-xs text-zinc-500">Your repertoire, move by move</p>
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
] as const;

const FEATURES = [
  "Full variation trees with comments and annotations from PGN",
  "Line statistics — depth, branch count, and total moves",
  "Board-based study with repertoire-constrained move choices",
  "Local library — keep multiple repertoires and switch anytime",
] as const;

export default function HomePage() {
  return (
    <div className="bg-zinc-50">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Build, import, and study your opening repertoire
            </h1>
            <p className="mt-4 text-lg text-zinc-600">
              RepertoireLab helps you organize chess opening lines, explore
              variations, and drill them on an interactive board — whether you
              import from PGN or build from scratch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/repertoires/new"
                className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Create a repertoire
              </Link>
              <Link
                href="/upload"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 transition hover:bg-zinc-50"
              >
                Import a PGN
              </Link>
            </div>
          </div>
          <HeroBoardIllustration />
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-zinc-900">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-zinc-900">
            Everything you need to study openings
          </h2>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200"
              >
                <span className="mt-0.5 text-green-700" aria-hidden>
                  ✓
                </span>
                <span className="text-sm text-zinc-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white py-8">
        <p className="text-center text-sm text-zinc-500">
          Just want to play?{" "}
          <Link
            href="/board"
            className="font-medium text-green-700 hover:text-green-800"
          >
            Open an empty board
          </Link>
        </p>
      </footer>
    </div>
  );
}
