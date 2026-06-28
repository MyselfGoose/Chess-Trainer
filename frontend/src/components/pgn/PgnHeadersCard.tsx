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
  compact?: boolean;
}

export function PgnHeadersCard({ game, compact = false }: PgnHeadersCardProps) {
  const { meta } = game;
  const additionalTags = Object.keys(meta).filter(
    (key) =>
      !PRIMARY_TAGS.includes(key as (typeof PRIMARY_TAGS)[number]) &&
      key !== "SetUp" &&
      key !== "FEN",
  );

  const hasCustomFen = meta.SetUp === "1" && meta.FEN;

  return (
    <div
      className={
        compact
          ? "min-w-0"
          : "min-w-0 rounded-lg bg-surface p-4 ring-1 ring-border"
      }
    >
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-foreground">
          {meta.White ?? "White"} vs {meta.Black ?? "Black"}
        </h3>
        {meta.Result ? (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {meta.Result}
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid min-w-0 gap-2 text-sm">
        {meta.Event ? (
          <div className="grid min-w-0 grid-cols-[4.5rem_1fr] gap-2">
            <dt className="font-medium text-muted-foreground">Event</dt>
            <dd className="break-words text-foreground">{meta.Event}</dd>
          </div>
        ) : null}
        {meta.Date ? (
          <div className="grid min-w-0 grid-cols-[4.5rem_1fr] gap-2">
            <dt className="font-medium text-muted-foreground">Date</dt>
            <dd className="break-words text-foreground">{meta.Date}</dd>
          </div>
        ) : null}
        {meta.ECO ? (
          <div className="grid min-w-0 grid-cols-[4.5rem_1fr] gap-2">
            <dt className="font-medium text-muted-foreground">ECO</dt>
            <dd className="break-words text-foreground">{meta.ECO}</dd>
          </div>
        ) : null}
        {meta.Opening ? (
          <div className="grid min-w-0 grid-cols-[4.5rem_1fr] gap-2">
            <dt className="font-medium text-muted-foreground">Opening</dt>
            <dd className="break-words text-foreground">{meta.Opening}</dd>
          </div>
        ) : null}
      </dl>

      {hasCustomFen ? (
        <p className="mt-3 break-words rounded-md bg-info-muted px-2 py-1.5 text-xs text-blue-800">
          Custom starting position
        </p>
      ) : null}

      {additionalTags.length > 0 ? (
        <details className="mt-3 min-w-0">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Additional tags ({additionalTags.length})
          </summary>
          <dl className="mt-2 grid min-w-0 gap-1 text-xs">
            {additionalTags.map((key) => (
              <div
                key={key}
                className="grid min-w-0 grid-cols-[5.5rem_1fr] gap-2"
              >
                <dt className="truncate text-muted-foreground">{key}</dt>
                <dd className="break-words text-foreground/90">{meta[key]}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
