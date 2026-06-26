"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RepertoireBuilder } from "@/components/repertoires/RepertoireBuilder";
import { REPERTOIRE_NAME_MAX_LENGTH } from "@/lib/repertoires";

export default function NewRepertoirePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-zinc-100 px-4">
        <form
          className="w-full max-w-md rounded-xl bg-white p-8 ring-1 ring-zinc-200"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) {
              setStarted(true);
            }
          }}
        >
          <h1 className="text-2xl font-bold text-zinc-900">
            Create a repertoire
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Give your repertoire a name to get started. You can change it later.
          </p>
          <label className="mt-6 block">
            <span className="text-sm font-medium text-zinc-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={REPERTOIRE_NAME_MAX_LENGTH}
              placeholder="e.g. Sicilian Defense"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              autoFocus
              required
            />
          </label>
          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              Start building
            </button>
            <button
              type="button"
              onClick={() => router.push("/repertoires")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return <RepertoireBuilder initialName={name.trim()} />;
}
