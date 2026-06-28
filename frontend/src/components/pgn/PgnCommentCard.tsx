"use client";

import { formatAnnotations } from "@/lib/pgn";
import type { StudyNode } from "@/lib/pgn";

interface PgnCommentCardProps {
  node: StudyNode | null;
}

export function PgnCommentCard({ node }: PgnCommentCardProps) {
  if (!node) {
    return null;
  }

  const comment = node.comment?.trim();
  const nagText = formatAnnotations(node.annotations);

  if (!comment && !nagText) {
    return null;
  }

  return (
    <div className="max-h-[30vh] shrink-0 overflow-y-auto rounded-lg bg-white p-3 ring-1 ring-zinc-200 lg:max-h-48">
      {nagText ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {node.annotations?.map((nag) => (
            <span
              key={nag}
              className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
            >
              {formatAnnotations([nag])}
            </span>
          ))}
        </div>
      ) : null}
      {comment ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
          {comment}
        </p>
      ) : null}
    </div>
  );
}
