import type { StudyGame } from "@/lib/pgn";

const PRIMARY_TAGS = [
  "Event",
  "Site",
  "Date",
  "Round",
  "White",
  "Black",
  "Result",
  "ECO",
  "Opening",
] as const;

interface PgnHeadersCardProps {
  game: StudyGame;
}

export function PgnHeadersCard({ game }: PgnHeadersCardProps) {
  const { meta } = game;
  const additionalTags = Object.keys(meta).filter(
    (key) =>
      !PRIMARY_TAGS.includes(key as (typeof PRIMARY_TAGS)[number]) &&
      key !== "SetUp" &&
      key !== "FEN",
  );

  const hasCustomFen = meta.SetUp === "1" && meta.FEN;

  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          {meta.White ?? "White"} vs {meta.Black ?? "Black"}
        </h2>
        {meta.Result ? (
          <span className="text-sm font-medium text-zinc-500">{meta.Result}</span>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-2 text-sm">
        {meta.Event ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-medium text-zinc-500">Event</dt>
            <dd className="text-zinc-800">{meta.Event}</dd>
          </div>
        ) : null}
        {meta.Date ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-medium text-zinc-500">Date</dt>
            <dd className="text-zinc-800">{meta.Date}</dd>
          </div>
        ) : null}
        {meta.ECO ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-medium text-zinc-500">ECO</dt>
            <dd className="text-zinc-800">{meta.ECO}</dd>
          </div>
        ) : null}
        {meta.Opening ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-medium text-zinc-500">Opening</dt>
            <dd className="text-zinc-800">{meta.Opening}</dd>
          </div>
        ) : null}
      </dl>

      {hasCustomFen ? (
        <p className="mt-3 rounded-md bg-blue-50 px-2 py-1.5 text-xs text-blue-800">
          Custom starting position
        </p>
      ) : null}

      {additionalTags.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500">
            Additional tags ({additionalTags.length})
          </summary>
          <dl className="mt-2 grid gap-1 text-xs">
            {additionalTags.map((key) => (
              <div key={key} className="flex gap-2">
                <dt className="w-24 shrink-0 text-zinc-500">{key}</dt>
                <dd className="text-zinc-700">{meta[key]}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
