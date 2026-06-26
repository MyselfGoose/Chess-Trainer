import Link from "next/link";

import { RepertoireList } from "@/components/repertoires/RepertoireList";

export default function RepertoiresPage() {
  return (
    <div className="min-h-full bg-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Your repertoires</h1>
            <p className="mt-1 text-zinc-600">
              Study imported PGNs or repertoires you built by hand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/upload"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 transition hover:bg-zinc-50"
            >
              Import PGN
            </Link>
            <Link
              href="/repertoires/new"
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              Create repertoire
            </Link>
          </div>
        </header>

        <RepertoireList />
      </div>
    </div>
  );
}
