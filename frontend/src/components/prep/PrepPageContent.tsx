"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { loadEcoData, type EcoEntry } from "@/lib/openings/lookup";
import {
  buildPrepPlan,
  createOpponentProfile,
  deleteOpponentProfile,
  listOpponentProfiles,
  saveOpponentProfile,
  updateOpponentProfile,
  type LikelyOpening,
  type OpponentProfile,
  type PrepPlan,
} from "@/lib/prep";
import { listRepertoires, sortedChapters } from "@/lib/repertoires";
import type { Repertoire } from "@/lib/repertoires/types";
import { getMasteryForRepertoire } from "@/lib/training";

const EMPTY_LIKELY_OPENING: LikelyOpening = {
  name: "",
  repertoireId: "",
};

function formatMatchDate(iso: string | undefined): string {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildTrainingHref(repertoireId: string, lineIds: string[]): string {
  const params = new URLSearchParams({
    lines: lineIds.join(","),
    color: "white",
  });
  return `/training/${repertoireId}?${params.toString()}`;
}

function OpponentCard({
  opponent,
  repertoires,
  ecoEntries,
  onEdit,
  onDelete,
}: {
  opponent: OpponentProfile;
  repertoires: Repertoire[];
  ecoEntries: EcoEntry[];
  onEdit: (opponent: OpponentProfile) => void;
  onDelete: (id: string) => void;
}) {
  const [plan, setPlan] = useState<PrepPlan | null>(null);

  const masteryRecords = useMemo(
    () => repertoires.flatMap((entry) => getMasteryForRepertoire(entry.id)),
    [repertoires],
  );

  const handleGeneratePlan = () => {
    setPlan(buildPrepPlan(opponent, repertoires, ecoEntries, masteryRecords));
  };

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{opponent.name}</h2>
          {opponent.matchDate ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Match: {formatMatchDate(opponent.matchDate)}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {opponent.likelyOpenings.length} likely opening
            {opponent.likelyOpenings.length === 1 ? "" : "s"}
          </p>
          {opponent.notes ? (
            <p className="mt-2 text-sm text-foreground/90">{opponent.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(opponent)}
            className="rounded-lg bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(opponent.id)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-danger"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleGeneratePlan}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Generate prep plan
        </button>
      </div>

      {plan ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {plan.totalLines} line{plan.totalLines === 1 ? "" : "s"} across{" "}
            {plan.groups.length} repertoire{plan.groups.length === 1 ? "" : "s"}
          </p>
          {plan.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lines matched. Check likely openings and repertoire content.
            </p>
          ) : (
            plan.groups.map((group) => (
              <div
                key={group.repertoireId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{group.repertoireName}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.lineCount} line{group.lineCount === 1 ? "" : "s"} ·{" "}
                    {group.readinessPercent}% readiness
                  </p>
                </div>
                <Link
                  href={buildTrainingHref(group.repertoireId, group.lineIds)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Train
                </Link>
              </div>
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}

export function PrepPageContent() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [opponents, setOpponents] = useState<OpponentProfile[]>([]);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [ecoEntries, setEcoEntries] = useState<EcoEntry[]>([]);
  const [ecoError, setEcoError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [likelyOpenings, setLikelyOpenings] = useState<LikelyOpening[]>([
    { ...EMPTY_LIKELY_OPENING },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshOpponents = useCallback(() => {
    setOpponents(listOpponentProfiles());
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only init */
    setRepertoires(listRepertoires());
    refreshOpponents();
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshOpponents]);

  useEffect(() => {
    let cancelled = false;
    loadEcoData()
      .then((entries) => {
        if (!cancelled) {
          setEcoEntries(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEcoError("Opening data unavailable — ECO filters may not work.");
          setEcoEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNotes("");
    setMatchDate("");
    setLikelyOpenings([{ ...EMPTY_LIKELY_OPENING }]);
    setFormError(null);
  };

  const startEdit = (opponent: OpponentProfile) => {
    setEditingId(opponent.id);
    setName(opponent.name);
    setNotes(opponent.notes ?? "");
    setMatchDate(opponent.matchDate ?? "");
    setLikelyOpenings(
      opponent.likelyOpenings.length > 0
        ? opponent.likelyOpenings.map((opening) => ({ ...opening }))
        : [{ ...EMPTY_LIKELY_OPENING }],
    );
    setFormError(null);
  };

  const handleDelete = (id: string) => {
    deleteOpponentProfile(id);
    if (editingId === id) {
      resetForm();
    }
    refreshOpponents();
  };

  const updateLikelyOpening = (
    index: number,
    patch: Partial<LikelyOpening>,
  ) => {
    setLikelyOpenings((current) =>
      current.map((opening, openingIndex) =>
        openingIndex === index ? { ...opening, ...patch } : opening,
      ),
    );
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Opponent name is required.");
      return;
    }

    const normalizedOpenings = likelyOpenings
      .map((opening) => ({
        ...opening,
        name: opening.name.trim(),
        eco: opening.eco?.trim().toUpperCase() || undefined,
        chapterId: opening.chapterId || undefined,
      }))
      .filter((opening) => opening.repertoireId);

    const existing = editingId
      ? opponents.find((entry) => entry.id === editingId)
      : null;

    const profile = existing
      ? updateOpponentProfile(existing, {
          name: trimmedName,
          notes,
          matchDate: matchDate || undefined,
          likelyOpenings: normalizedOpenings,
        })
      : createOpponentProfile({
          name: trimmedName,
          notes,
          matchDate: matchDate || undefined,
          likelyOpenings: normalizedOpenings,
        });

    saveOpponentProfile(profile);
    refreshOpponents();
    resetForm();
  };

  if (!isHydrated) {
    return <p className="text-sm text-muted-foreground">Loading prep…</p>;
  }

  return (
    <div className="space-y-8">
      {ecoError ? <p className="text-sm text-warning">{ecoError}</p> : null}

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {editingId ? "Edit opponent" : "New opponent"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-foreground/90">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Rival Player"
            />
          </label>
          <label className="block text-sm font-medium text-foreground/90">
            Match date (optional)
            <input
              type="date"
              value={matchDate}
              onChange={(event) => setMatchDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-foreground/90">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="Plays aggressive Sicilian as Black…"
          />
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Likely openings
            </h3>
            <button
              type="button"
              onClick={() =>
                setLikelyOpenings((current) => [
                  ...current,
                  { ...EMPTY_LIKELY_OPENING },
                ])
              }
              className="text-sm font-medium text-accent"
            >
              Add opening
            </button>
          </div>

          {repertoires.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Create a repertoire first to link likely openings.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {likelyOpenings.map((opening, index) => {
                const repertoire = repertoires.find(
                  (entry) => entry.id === opening.repertoireId,
                );
                const chapters = repertoire
                  ? sortedChapters(repertoire.meta)
                  : [];

                return (
                  <li
                    key={`likely-${index}`}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-muted-foreground">
                        Label (optional)
                        <input
                          type="text"
                          value={opening.name}
                          onChange={(event) =>
                            updateLikelyOpening(index, { name: event.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                          placeholder="Sicilian"
                        />
                      </label>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Repertoire
                        <select
                          value={opening.repertoireId}
                          onChange={(event) =>
                            updateLikelyOpening(index, {
                              repertoireId: event.target.value,
                              chapterId: undefined,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        >
                          <option value="">Select repertoire…</option>
                          {repertoires.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {chapters.length > 0 ? (
                        <label className="block text-xs font-medium text-muted-foreground">
                          Chapter (optional)
                          <select
                            value={opening.chapterId ?? ""}
                            onChange={(event) =>
                              updateLikelyOpening(index, {
                                chapterId: event.target.value || undefined,
                              })
                            }
                            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                          >
                            <option value="">All chapters</option>
                            {chapters.map((chapter) => (
                              <option key={chapter.id} value={chapter.id}>
                                {chapter.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <label className="block text-xs font-medium text-muted-foreground">
                        ECO code (optional)
                        <input
                          type="text"
                          value={opening.eco ?? ""}
                          onChange={(event) =>
                            updateLikelyOpening(index, { eco: event.target.value })
                          }
                          placeholder="B20"
                          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm uppercase"
                        />
                      </label>
                    </div>
                    {likelyOpenings.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLikelyOpenings((current) =>
                            current.filter((_, openingIndex) => openingIndex !== index),
                          )
                        }
                        className="mt-2 text-xs font-medium text-danger"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {formError ? (
          <p className="mt-3 text-sm text-danger">{formError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {editingId ? "Save changes" : "Create opponent"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Opponents</h2>
        {opponents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No opponent profiles yet. Create one to build a targeted prep plan.
          </p>
        ) : (
          opponents.map((opponent) => (
            <OpponentCard
              key={opponent.id}
              opponent={opponent}
              repertoires={repertoires}
              ecoEntries={ecoEntries}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>
    </div>
  );
}
