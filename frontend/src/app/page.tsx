import Link from "next/link";

import { PgnUploadForm } from "@/components/pgn/PgnUploadForm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            Upload your opening repertoire
          </h1>
          <p className="mt-2 text-zinc-600">
            Import PGN files with variations, comments, and annotations to study
            on the board.
          </p>
        </header>

        <PgnUploadForm />

        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link
            href="/board"
            className="font-medium text-green-700 hover:text-green-800"
          >
            Open empty board
          </Link>{" "}
          to play without a PGN loaded.
        </p>
      </div>
    </div>
  );
}
